# Create automated deployment files for cmx-ui

import os, textwrap, json, pathlib

base = "/mnt/data/cmx-ui-deploy-kit"
os.makedirs(base, exist_ok=True)

deploy_sh = """#!/usr/bin/env bash
set -euo pipefail

# ===============================
# Automated cmx-ui deploy to AWS
# Resources: S3 (private) + CloudFront (OAC) + ACM (us-east-1) + Route53 alias
# Prereqs: awscli v2 configured, npm build already done (dist/), Route53 hosted zone exists
# ===============================

# ---- User Inputs (export ahead of time or edit here) ----
: "${APP:=cmx}"
: "${AWS_REGION:=ap-southeast-1}"
: "${HOSTED_ZONE_ID:?Set Route53 HOSTED_ZONE_ID}"
: "${UI_DOMAIN:?Set UI_DOMAIN, e.g. app.cmx.example.com}"
: "${UI_BUILD_DIR:=./cmx-ui/dist}"

# ---- Derived ----
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
UI_BUCKET="${APP}-ui-prod-${AWS_ACCOUNT_ID}"

echo "Using:"
echo "  APP=${APP}"
echo "  AWS_REGION=${AWS_REGION}"
echo "  HOSTED_ZONE_ID=${HOSTED_ZONE_ID}"
echo "  UI_DOMAIN=${UI_DOMAIN}"
echo "  UI_BUCKET=${UI_BUCKET}"
echo "  UI_BUILD_DIR=${UI_BUILD_DIR}"
echo

# 1) Ensure build exists
if [ ! -d "${UI_BUILD_DIR}" ]; then
  echo "Build directory not found: ${UI_BUILD_DIR}"
  echo "Run your UI build (e.g., npm run build) and set UI_BUILD_DIR accordingly."
  exit 1
fi

# 2) Create S3 bucket (idempotent)
if ! aws s3api head-bucket --bucket "${UI_BUCKET}" 2>/dev/null; then
  echo "Creating bucket s3://${UI_BUCKET} in ${AWS_REGION} ..."
  aws s3api create-bucket \
    --bucket "${UI_BUCKET}" \
    --create-bucket-configuration LocationConstraint="${AWS_REGION}"
fi

# Block public access
aws s3api put-public-access-block --bucket "${UI_BUCKET}" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 3) Request/ensure ACM cert (us-east-1) for CloudFront
echo "Requesting/ensuring ACM cert in us-east-1 for ${UI_DOMAIN} ..."
CF_CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='${UI_DOMAIN}'].CertificateArn | [0]" --output text)
if [ "${CF_CERT_ARN}" = "None" ] || [ -z "${CF_CERT_ARN}" ]; then
  CF_CERT_ARN=$(aws acm request-certificate --region us-east-1 \
    --domain-name "${UI_DOMAIN}" --validation-method DNS \
    --query CertificateArn --output text)
  echo "  New certificate requested: ${CF_CERT_ARN}"
else
  echo "  Reusing existing certificate: ${CF_CERT_ARN}"
fi

# Create DNS validation record(s) if needed
STATUS=$(aws acm describe-certificate --region us-east-1 --certificate-arn "${CF_CERT_ARN}" --query "Certificate.Status" --output text)
if [ "${STATUS}" != "ISSUED" ]; then
  echo "  Creating Route53 DNS validation record(s)..."
  records=$(aws acm describe-certificate --region us-east-1 --certificate-arn "${CF_CERT_ARN}" \
    --query "Certificate.DomainValidationOptions[].ResourceRecord" --output json)
  for row in $(echo "${records}" | jq -c '.[]'); do
    NAME=$(echo "${row}" | jq -r '.Name')
    TYPE=$(echo "${row}" | jq -r '.Type')
    VALUE=$(echo "${row}" | jq -r '.Value')
    cat > /tmp/cert-change.json <<EOF
{
  "Comment": "ACM validation for ${UI_DOMAIN}",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${NAME}",
      "Type": "${TYPE}",
      "TTL": 300,
      "ResourceRecords": [{ "Value": "${VALUE}" }]
    }
  }]
}
EOF
    aws route53 change-resource-record-sets --hosted-zone-id "${HOSTED_ZONE_ID}" --change-batch file:///tmp/cert-change.json >/dev/null
  done
  echo "  Waiting for certificate to be ISSUED... (this can take a few minutes)"
  aws acm wait certificate-validated --region us-east-1 --certificate-arn "${CF_CERT_ARN}"
fi
echo "Certificate is ISSUED."

# 4) Create Origin Access Control (OAC) if not exists
OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${APP}-oac'].Id | [0]" --output text)
if [ "${OAC_ID}" = "None" ] || [ -z "${OAC_ID}" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config "{
    \\"Name\\": \\"${APP}-oac\\",
    \\"Description\\": \\"OAC for ${APP} UI\\",
    \\"SigningProtocol\\": \\"sigv4\\",
    \\"SigningBehavior\\": \\"always\\",
    \\"OriginAccessControlOriginType\\": \\"s3\\"
  }" --query 'OriginAccessControl.Id' --output text)
  echo "Created OAC: ${OAC_ID}"
else
  echo "Reusing OAC: ${OAC_ID}"
fi

# 5) Create CloudFront distribution (or reuse existing by alias)
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(join(',',Aliases.Items), '${UI_DOMAIN}')].Id | [0]" --output text)
if [ "${DIST_ID}" = "None" ] || [ -z "${DIST_ID}" ]; then
  echo "Creating CloudFront distribution..."
  CALLER_REF=$(date +%s)
  cat > /tmp/cf-ui.json <<EOF
{
  "CallerReference": "${CALLER_REF}",
  "Comment": "${APP} UI",
  "Aliases": { "Quantity": 1, "Items": ["${UI_DOMAIN}"] },
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-${UI_BUCKET}",
      "DomainName": "${UI_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
      "S3OriginConfig": { "OriginAccessIdentity": "" },
      "OriginAccessControlId": "${OAC_ID}"
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-${UI_BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
    "ForwardedValues": { "QueryString": false, "Cookies": { "Forward": "none" } },
    "MinTTL": 0
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponseCode": "200", "ResponsePagePath": "/index.html" },
      { "ErrorCode": 404, "ResponseCode": "200", "ResponsePagePath": "/index.html" }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "${CF_CERT_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
EOF
  DIST_ID=$(aws cloudfront create-distribution --distribution-config file:///tmp/cf-ui.json --query 'Distribution.Id' --output text)
  echo "Created distribution: ${DIST_ID}"
else
  echo "Reusing distribution: ${DIST_ID}"
fi

CF_DOMAIN=$(aws cloudfront get-distribution --id "${DIST_ID}" --query 'Distribution.DomainName' --output text)
echo "CloudFront domain: ${CF_DOMAIN}"

# 6) Bucket policy: allow this distribution to read
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontReadViaOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${UI_BUCKET}/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::${AWS_ACCOUNT_ID}:distribution/${DIST_ID}"
      }
    }
  }]
}
EOF
aws s3api put-bucket-policy --bucket "${UI_BUCKET}" --policy file:///tmp/bucket-policy.json

# 7) Upload build
aws s3 sync "${UI_BUILD_DIR}/" "s3://${UI_BUCKET}" --delete

# 8) Route53 ALIAS to CloudFront
# HostedZoneId for CloudFront is Z2FDTNDATAQYW2 (global)
cat > /tmp/ui-alias.json <<EOF
{
  "Comment": "Alias ${UI_DOMAIN} to CloudFront",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${UI_DOMAIN}",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "${CF_DOMAIN}",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF
aws route53 change-resource-record-sets --hosted-zone-id "${HOSTED_ZONE_ID}" --change-batch file:///tmp/ui-alias.json >/dev/null

# 9) Invalidate cache (first deploy clears everything)
aws cloudfront create-invalidation --distribution-id "${DIST_ID}" --paths "/*" >/dev/null

echo
echo "Done! Visit: https://${UI_DOMAIN}"
"""

gha_yaml = """name: cmx-ui deploy
on:
  push:
    branches: [ main ]
jobs:
  build-upload:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build
        working-directory: cmx-ui
        run: |
          echo "VITE_API_BASE=${{ secrets.VITE_API_BASE }}" > .env.production
          npm ci
          npm run build
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/cmx-uiGithubOIDC
          aws-region: ap-southeast-1
      - name: Upload to S3
        run: aws s3 sync cmx-ui/dist/ s3://cmx-ui-prod-${{ secrets.AWS_ACCOUNT_ID }} --delete
      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
"""

readme = """# cmx-ui Deploy Kit (S3 + CloudFront, OAC, ACM, Route53)

## Files
- `deploy-cmx-ui.sh` – one-click(ish) deployment script.
- `cmx-ui-ci.yml` – GitHub Actions workflow example for continuous deploys.

## Usage
1. Build your UI locally (Vite/React/Angular) so that `./cmx-ui/dist` exists.
2. Export required env vars and run the script:

```bash
export HOSTED_ZONE_ID=ZXXXXXXXXXXXXX        # your Route53 zone
export UI_DOMAIN=app.cmx.example.com        # desired UI hostname
# optional overrides:
export APP=cmx
export AWS_REGION=ap-southeast

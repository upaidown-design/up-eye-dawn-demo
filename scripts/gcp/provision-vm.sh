#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-6ec58af7-91e9-4c25-870}"
REGION="${REGION:-europe-west1}"
ZONE="${ZONE:-europe-west1-b}"
VM_NAME="${VM_NAME:-ued-prod-01}"
NETWORK="${NETWORK:-ued-prod-vpc}"
SUBNET="${SUBNET:-ued-prod-subnet}"
ADDRESS_NAME="${ADDRESS_NAME:-ued-prod-ip}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-ued-prod-vm}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
BACKUP_BUCKET="${BACKUP_BUCKET:-${PROJECT_ID}-ued-backups}"

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable compute.googleapis.com iam.googleapis.com logging.googleapis.com monitoring.googleapis.com storage.googleapis.com secretmanager.googleapis.com

gcloud compute networks describe "$NETWORK" >/dev/null 2>&1 || \
  gcloud compute networks create "$NETWORK" --subnet-mode=custom

gcloud compute networks subnets describe "$SUBNET" --region="$REGION" >/dev/null 2>&1 || \
  gcloud compute networks subnets create "$SUBNET" --network="$NETWORK" --region="$REGION" --range=10.42.0.0/24 --enable-private-ip-google-access

gcloud compute firewall-rules describe ued-allow-web >/dev/null 2>&1 || \
  gcloud compute firewall-rules create ued-allow-web --network="$NETWORK" --direction=INGRESS --priority=1000 --action=ALLOW --rules=tcp:80,tcp:443,udp:443 --source-ranges=0.0.0.0/0 --target-tags=ued-web

gcloud compute firewall-rules describe ued-allow-iap-ssh >/dev/null 2>&1 || \
  gcloud compute firewall-rules create ued-allow-iap-ssh --network="$NETWORK" --direction=INGRESS --priority=1000 --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=ued-iap-ssh

gcloud iam service-accounts describe "$SERVICE_ACCOUNT" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" --display-name="UP-EYE-DAWN production VM"

for role in roles/logging.logWriter roles/monitoring.metricWriter roles/storage.objectAdmin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SERVICE_ACCOUNT}" --role="$role" --condition=None >/dev/null
done

gcloud compute addresses describe "$ADDRESS_NAME" --region="$REGION" >/dev/null 2>&1 || \
  gcloud compute addresses create "$ADDRESS_NAME" --region="$REGION" --network-tier=PREMIUM
PUBLIC_IP="$(gcloud compute addresses describe "$ADDRESS_NAME" --region="$REGION" --format='value(address)')"

gcloud storage buckets describe "gs://${BACKUP_BUCKET}" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://${BACKUP_BUCKET}" --location="$REGION" --uniform-bucket-level-access

gcloud compute project-info add-metadata --metadata=enable-oslogin=TRUE >/dev/null

if ! gcloud compute instances describe "$VM_NAME" --zone="$ZONE" >/dev/null 2>&1; then
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type=e2-medium \
    --network="$NETWORK" \
    --subnet="$SUBNET" \
    --address="$PUBLIC_IP" \
    --network-tier=PREMIUM \
    --service-account="$SERVICE_ACCOUNT" \
    --scopes=cloud-platform \
    --tags=ued-web,ued-iap-ssh \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-type=pd-balanced \
    --boot-disk-size=50GB \
    --metadata-from-file=startup-script=infra/gcp/startup.sh \
    --shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --deletion-protection \
    --labels=application=up-eye-dawn,environment=production
fi

printf '%s\n' "$PUBLIC_IP"

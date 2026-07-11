import os
import logging
import boto3
from io import BytesIO
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class CloudVault:
    """
    Dual-cloud storage vault with automatic failover.
    Primary: Backblaze B2
    Fallback: Cloudflare R2 (existing production bucket)
    """

    def __init__(self):
        # --- Backblaze B2 (Primary) ---
        self.b2_s3 = boto3.client(
            service_name="s3",
            endpoint_url=os.environ.get("B2_S3_ENDPOINT", "https://s3.us-west-004.backblazeb2.com"),
            aws_access_key_id=os.environ.get("B2_KEY_ID"),
            aws_secret_access_key=os.environ.get("B2_APPLICATION_KEY"),
            region_name="us-west-004",
        )
        self.b2_bucket = os.environ.get("B2_BUCKET_NAME", "ceka-resources-vault")
        self.b2_public_base = os.environ.get("B2_PUBLIC_BASE_URL", "https://f000.backblazeb2.com/file/ceka-resources-vault")

        # --- Cloudflare R2 (Fallback — EXISTING BUCKET) ---
        r2_account_id = os.environ.get("R2_ACCOUNT_ID")
        self.r2_s3 = boto3.client(
            service_name="s3",
            endpoint_url=f"https://{r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"),
            region_name="auto",
        )
        self.r2_bucket = "nasaka-static"
        self.r2_public_base = "https://cdn.civiceducationkenya.com"

    def file_exists(self, remote_path):
        """
        Check if a file already exists in either cloud.
        Checks R2 first (zero egress, generous free tier),
        then falls back to B2.
        """
        # Check R2 first
        try:
            self.r2_s3.head_object(Bucket=self.r2_bucket, Key=remote_path)
            return True
        except ClientError:
            pass  # Not in R2, check B2

        # Check Backblaze B2
        try:
            self.b2_s3.head_object(Bucket=self.b2_bucket, Key=remote_path)
            return True
        except ClientError:
            return False

    def upload_file(self, local_path, remote_path):
        """
        Upload a file with automatic failover.
        Returns the public URL of the uploaded file.
        """
        # Try Primary: Backblaze B2
        try:
            self.b2_s3.upload_file(local_path, self.b2_bucket, remote_path)
            url = f"{self.b2_public_base}/{remote_path}"
            logger.info(f"✅ Uploaded to Backblaze B2: {remote_path}")
            return url

        except ClientError as e:
            logger.warning(f"⚠️ Backblaze B2 failed for '{remote_path}': {e}. Failing over to Cloudflare R2.")

        # Try Secondary: Cloudflare R2
        try:
            self.r2_s3.upload_file(local_path, self.r2_bucket, remote_path)
            url = f"{self.r2_public_base}/{remote_path}"
            logger.info(f"✅ Uploaded to Cloudflare R2 (failover): {remote_path}")
            return url

        except ClientError as e:
            logger.error(f"❌ Both Backblaze B2 and Cloudflare R2 failed for '{remote_path}': {e}")
            raise

    def upload_bytes(self, data_bytes, remote_path, content_type="application/pdf"):
        """
        Upload raw bytes with automatic failover.
        Returns the public URL of the uploaded file.
        """
        # Try Primary: Backblaze B2
        try:
            self.b2_s3.upload_fileobj(
                BytesIO(data_bytes),
                self.b2_bucket,
                remote_path,
                ExtraArgs={"ContentType": content_type},
            )
            url = f"{self.b2_public_base}/{remote_path}"
            logger.info(f"✅ Uploaded to Backblaze B2: {remote_path}")
            return url

        except ClientError as e:
            logger.warning(f"⚠️ Backblaze B2 failed for '{remote_path}': {e}. Failing over to Cloudflare R2.")

        # Try Secondary: Cloudflare R2
        try:
            self.r2_s3.upload_fileobj(
                BytesIO(data_bytes),
                self.r2_bucket,
                remote_path,
                ExtraArgs={"ContentType": content_type},
            )
            url = f"{self.r2_public_base}/{remote_path}"
            logger.info(f"✅ Uploaded to Cloudflare R2 (failover): {remote_path}")
            return url

        except ClientError as e:
            logger.error(f"❌ Both Backblaze B2 and Cloudflare R2 failed for '{remote_path}': {e}")
            raise

    def get_public_url(self, remote_path):
        """
        Returns the public URL for a file, checking R2 first, then B2.
        """
        # Check R2 first
        try:
            self.r2_s3.head_object(Bucket=self.r2_bucket, Key=remote_path)
            return f"{self.r2_public_base}/{remote_path}"
        except ClientError:
            pass

        # Check B2
        try:
            self.b2_s3.head_object(Bucket=self.b2_bucket, Key=remote_path)
            return f"{self.b2_public_base}/{remote_path}"
        except ClientError:
            return None

    def get_signed_url(self, remote_path, expires_in=3600):
        try:
            url = self.r2_s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.r2_bucket, 'Key': remote_path},
                ExpiresIn=expires_in
            )
            return url
        except Exception:
            pass
            
        try:
            url = self.b2_s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.b2_bucket, 'Key': remote_path},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            return None

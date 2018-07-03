module.exports = {
  apiVersion: process.env.AWS_API_VERSION,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3Dir: process.env.S3_DIR,
  s3Bucket: process.env.S3_BUCKET,
  elasticPipeline: process.env.ELASTIC_PIPELINE,
  transcriptsUri: process.env.TRANSCRIPTS_URI
}
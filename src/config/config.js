import dotenv from 'dotenv';

// Init dotenv config
// dotenv.config({ path: '../.env' });
dotenv.config();

export default {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    pass: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    pool_min: process.env.DB_POOL_MIN,
    pool_max: process.env.DB_POOL_MAX,
  },
  aws: {
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: process.env.AWS_BUCKET,
  },
  port: process.env.PORT,
  body_limit: process.env.BODY_LIMIT,
  media_share_api: process.env.MEDIA_SHARE_API,
  relative_temp_path: process.env.RELATIVE_TEMP_PATH,
};

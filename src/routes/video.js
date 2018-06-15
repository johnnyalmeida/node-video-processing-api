import express from 'express';
import VideoController from '../controllers/VideoController';
import VideoSchema from '../routes/schemas/VideoSchema';


/* GET /user */
// router.get('/', VideoSchema.list, VideoController.list);

// /* GET /user/:userId */
// router.get('/:userId', VideoSchema.get, VideoController.get);

/* POST /video */


/* PUT /user/:userId */
// router.put('/:userId', VideoSchema.put, VideoController.put);

// /* DELETE /user/:userId */
// router.delete('/:userId', VideoSchema.delete, VideoController.delete);

export default (config) => {
  const router = express.Router({ mergeParams: true });
  const videoController = new VideoController(config);

  router.post('/', VideoSchema.post, (req, res) => {
    videoController.post(req, res);
  });

  return router;
};

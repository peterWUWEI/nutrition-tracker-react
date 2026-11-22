import multer from 'multer'

import { MAX_PICTURE_BYTES } from '../lib/pictures.js'

// Parses multipart/form-data requests: text fields go to req.body, the file field "picture"
// to req.file (kept in memory so its content can be checked before saving).
// JSON requests pass straight through.
export const uploadPicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PICTURE_BYTES, files: 1 },
}).single('picture')

// Storing and checking uploaded food pictures.
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { config } from '../config.js'

export const MAX_PICTURE_BYTES = 5 * 1024 * 1024 // 5 MB

export interface ImageType {
  extension: 'jpg' | 'png' | 'webp'
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Identifies JPEG, PNG and WebP files by their first bytes ("magic bytes").
// The file name and the content type sent by the browser can't be trusted, the content can.
export function detectImageType(data: Buffer): ImageType | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' }
  }
  if (data.length >= 8 && data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { extension: 'png', mimeType: 'image/png' }
  }
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: 'webp', mimeType: 'image/webp' }
  }
  return null
}

const foodPicturesDir = () => path.join(config.uploadsDir, 'foods')

// Saves a picture under a random name and returns the URL it is served at.
export async function saveFoodPicture(data: Buffer, type: ImageType): Promise<string> {
  const fileName = `${randomUUID()}.${type.extension}`
  await fs.mkdir(foodPicturesDir(), { recursive: true })
  await fs.writeFile(path.join(foodPicturesDir(), fileName), data)
  return `/uploads/foods/${fileName}`
}

// Removes a picture saved by saveFoodPicture. Missing files are ignored.
export async function deleteFoodPicture(pictureUrl: string): Promise<void> {
  await fs.rm(path.join(foodPicturesDir(), path.basename(pictureUrl)), { force: true })
}

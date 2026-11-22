// Spec: recognising an uploaded picture by its content (the "magic bytes" at the start of
// the file), not by its name or the content type the browser claims.
import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { images } from '../test/helpers.js'
import { detectImageType } from './pictures.js'

describe('detectImageType', () => {
  it.each([
    ['PNG', images.png, { extension: 'png', mimeType: 'image/png' }],
    ['JPEG', images.jpeg, { extension: 'jpg', mimeType: 'image/jpeg' }],
    ['WebP', images.webp, { extension: 'webp', mimeType: 'image/webp' }],
  ])('recognises a %s file', (_format, file, expected) => {
    expect(detectImageType(fs.readFileSync(file))).toEqual(expected)
  })

  it('does not accept GIF images', () => {
    expect(detectImageType(fs.readFileSync(images.gif))).toBeNull()
  })

  it('does not accept files that are not images', () => {
    expect(detectImageType(Buffer.from('definitely not an image'))).toBeNull()
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })
})

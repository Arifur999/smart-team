import { describe, expect, it } from 'vitest';
import { isInsideFolders } from './work-dir.js';

describe('isInsideFolders', () => {
  const folders = ['D:\\dev\\projects'];

  it('accepts the folder itself and anything inside it, ignoring case on Windows', () => {
    expect(isInsideFolders('D:\\dev\\projects', folders, 'win32')).toBe(true);
    expect(isInsideFolders('d:\\DEV\\projects\\cashfo\\src', folders, 'win32')).toBe(true);
  });

  it('rejects siblings, parents and escapes', () => {
    expect(isInsideFolders('D:\\dev\\projects-old', folders, 'win32')).toBe(false);
    expect(isInsideFolders('D:\\dev', folders, 'win32')).toBe(false);
    expect(isInsideFolders('D:\\dev\\projects\\..\\secrets', folders, 'win32')).toBe(false);
    expect(isInsideFolders('C:\\Windows', folders, 'win32')).toBe(false);
  });

  it('is case sensitive on Linux and macOS', () => {
    expect(isInsideFolders('/home/arif/code/app', ['/home/arif/code'], 'linux')).toBe(true);
    expect(isInsideFolders('/home/arif/Code/app', ['/home/arif/code'], 'linux')).toBe(false);
  });

  it('rejects everything when the PC shares no folders', () => {
    expect(isInsideFolders('D:\\dev\\projects', [], 'win32')).toBe(false);
  });
});

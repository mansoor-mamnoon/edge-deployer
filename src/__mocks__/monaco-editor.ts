// Jest mock for monaco-editor (not needed in Node test environment)
export const editor = {
  create: jest.fn(),
  setModelLanguage: jest.fn(),
};
export const KeyMod = {};
export const KeyCode = {};

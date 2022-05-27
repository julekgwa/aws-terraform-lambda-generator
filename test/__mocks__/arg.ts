export const arg = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    failed: false
  });
});
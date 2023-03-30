export const saveApiKey = async (apiKey: string) => {
  await figma.clientStorage.setAsync("apiKey", apiKey);
};

export const getApiKey = async () => {
  const apiKey = await figma.clientStorage.getAsync("apiKey");
  return apiKey;
};

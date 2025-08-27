import Constants from "expo-constants";

const ENV = {
  dev: {
    // apiUrl: "http://192.168.1.3:8000",
    apiUrl: "http://127.0.0.1:8000",
  },
  prod: {
    apiUrl: "https://delta-back.ahmedatri.com",
    // apiUrl: "http://127.0.0.1:8000",
  },
};

const getEnvVars = () => {
  // You can add more sophisticated environment detection logic here
  const isDev = __DEV__;
  return isDev ? ENV.dev : ENV.prod;
};

export const getBaseUrl = () => {
  return getEnvVars().apiUrl;
};

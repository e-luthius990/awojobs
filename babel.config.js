module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@hooks": "./src/hooks",
            "@ui": "./src/ui",
            "@screens": "./src/screens",
            "@core": "./src/core",
            "@jobs": "./src/jobs",
            "@location": "./src/location",
            "@navigation": "./src/navigation",
            "@state": "./src/state",
            "@utils": "./src/utils"
          }
        }
      ]
    ]
  };
};

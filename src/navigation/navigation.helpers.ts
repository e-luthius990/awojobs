// src/navigation/navigation.helpers.ts

import { CommonActions, NavigationProp } from "@react-navigation/native";

/**
 * Reset app state safely to Feed tab.
 * Avoids deep nested state injection.
 * Keeps navigation tree stable.
 */
export function resetToFeed(navigation: NavigationProp<any>) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "App",
        },
      ],
    })
  );

  // After root reset, navigate to FeedTab explicitly
  requestAnimationFrame(() => {
    navigation.navigate("App", {
      screen: "FeedTab",
    });
  });
}

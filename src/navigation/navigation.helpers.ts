// src/navigation/navigation.helpers.ts

import {
  CommonActions,
  NavigationProp,
} from "@react-navigation/native";

import type { RootStackParamList } from "./navigation.types";

/**
 * Safely reset app to root App screen.
 * Role-based navigators will handle their own default tab.
 */
export function resetToApp(
  navigation: NavigationProp<RootStackParamList>
) {
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
}
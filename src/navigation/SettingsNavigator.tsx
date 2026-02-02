import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "../screens/settings/SettingsScreen";
import ChangePinScreen from "../screens/settings/ChangePinScreen";

const Stack = createNativeStackNavigator();

export function SettingsNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />

      <Stack.Screen
        name="ChangePin"
        component={ChangePinScreen}
        options={{ title: "Change PIN" }}
      />
    </Stack.Navigator>
  );
}

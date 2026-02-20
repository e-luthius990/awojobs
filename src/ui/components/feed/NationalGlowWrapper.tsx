import React from "react";
import { View, ViewStyle } from "react-native";

type Props = {
  active: boolean;
  children: React.ReactNode;
};

export default function NationalGlowWrapper({ active, children }: Props) {
  if (!active) return <>{children}</>;

  return (
    <View
      style={
        {
          borderWidth: 1,
          borderColor: "#2563EB",
          shadowColor: "#2563EB",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
          borderRadius: 20,
        } as ViewStyle
      }
    >
      {children}
    </View>
  );
}

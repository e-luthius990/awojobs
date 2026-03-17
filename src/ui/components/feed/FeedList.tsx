import React, { memo, useCallback, useMemo } from "react";
import { Pressable, type ViewStyle } from "react-native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import JobCard from "../job-card/JobCard";
import type { JobWithCoords } from "@jobs/jobs.types";
import type { FeedStackParamList } from "../../../navigation/FeedNavigator";
import type { RootStackParamList } from "../../../navigation/RootNavigator";
import { useTheme } from "../../../theme/useTheme";

type FeedNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<FeedStackParamList, "Feed">,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  item: JobWithCoords;
  navigation: FeedNavigationProp;
  isPremium: boolean;
};

function FeedListComponent({ item, navigation, isPremium }: Props) {
  const { theme } = useTheme();

  const baseStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const handlePress = useCallback(() => {
    navigation.navigate("JobDetail", {
      jobId: item.id,
    });
  }, [navigation, item.id]);

  const accessibilityLabel = useMemo(() => {
    const title = item.title?.trim() || "this job";
    return `Open job details for ${title}`;
  }, [item.title]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{
        color: theme.colors.buttonGhostBgPressed,
      }}
      style={({ pressed }) => [baseStyle, pressed ? { opacity: 0.985 } : null]}
    >
      <JobCard
        job={item}
        showLocation
        highlightSponsored={item.is_currently_sponsored}
        isPremium={isPremium}
      />
    </Pressable>
  );
}

export default memo(FeedListComponent);

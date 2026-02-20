import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";
import JobCard from "../job-card/JobCard";
import { JobWithCoords } from "@jobs/jobs.types";

type Props = {
  item: JobWithCoords;
  navigation: any;
  isPremium: boolean;
};

function FeedListComponent({ item, navigation, isPremium }: Props) {
  const handlePress = useCallback(() => {
    navigation.navigate("JobDetail", {
      jobId: item.id,
    });
  }, [navigation, item.id]);

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{
        color: isPremium ? "#E5E7EB" : "#E2E8F0",
      }}
      style={({ pressed }) => [
        styles.wrapper,
        isPremium && styles.premiumWrapper,
        pressed && styles.pressed,
      ]}
    >
      <JobCard
        job={item}
        showLocation
        highlightSponsored={item.is_sponsored}
        isPremium={isPremium}
      />
    </Pressable>
  );
}

export default memo(FeedListComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },

  premiumWrapper: {
    marginBottom: 16, // slightly more breathing room
  },

  pressed: {
    opacity: 0.94,
  },
});

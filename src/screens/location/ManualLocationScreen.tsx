import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ViewStyle,
} from "react";
import {
  FlatList,
  ActivityIndicator,
  Pressable,
  View,
  type ListRenderItem,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import { supabase } from "../../core/supabase";
import { setManualLocation } from "../../location/manual-location.cache";
import {
  getCachedList,
  setCachedList,
  saveCachedLocation,
} from "../../location/location.cache";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppInput } from "../../ui/AppInput";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { StatusBadge } from "../../ui/StatusBadge";

type Step = "district" | "town" | "sub_county";

type LocationOption = {
  id?: string;
  district?: string;
  town?: string;
  sub_county?: string;
};

async function getGpsCoords() {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
      timeout: 4000,
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}

function getStepTitle(step: Step) {
  if (step === "district") return "Choose district";
  if (step === "town") return "Choose town";
  return "Choose sub-county";
}

export default function ManualLocationScreen({ navigation }: any) {
  const { theme } = useTheme();
  const listRef = useRef<FlatList<LocationOption>>(null);

  const [step, setStep] = useState<Step>("district");
  const [district, setDistrict] = useState<string | null>(null);
  const [town, setTown] = useState<string | null>(null);

  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.screenY,
      paddingBottom: theme.spacing.xxxl,
    }),
    [
      theme.spacing.md,
      theme.spacing.screenX,
      theme.spacing.screenY,
      theme.spacing.xxxl,
    ],
  );

  const searchCardStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.screenY,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.screenX, theme.spacing.screenY, theme.spacing.xxxl],
  );

  const rowCardStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const rowInnerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const alphaRailStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      right: 4,
      top: 180,
      bottom: 96,
      justifyContent: "center",
      gap: 1,
    }),
    [],
  );

  const alphaItemStyle = useMemo<ViewStyle>(
    () => ({
      minWidth: 22,
      minHeight: 18,
      alignItems: "center",
      justifyContent: "center",
    }),
    [],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      paddingTop: theme.spacing.xl,
      alignItems: "center",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm, theme.spacing.xl],
  );

  useEffect(() => {
    void autoDetectDistrict();
  }, []);

  const autoDetectDistrict = useCallback(async () => {
    try {
      setDetecting(true);

      const coords = await getGpsCoords();
      if (!coords) return;

      const { data, error } = await supabase.rpc("get_nearest_district", {
        p_lat: coords.lat,
        p_lng: coords.lng,
      });

      if (error) return;

      if (data?.[0]?.district) {
        setDistrict(data[0].district);
        setStep("town");
      }
    } catch {
      // silent fallback
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      if (!active) return;

      setLoading(true);
      setError(null);

      const cacheKey =
        step === "district"
          ? "districts"
          : step === "town"
            ? `towns:${district}`
            : `subcounties:${district}:${town}`;

      try {
        const cached = await getCachedList<LocationOption>(cacheKey);

        if (cached && active) {
          setOptions(cached);
          setLoading(false);
          return;
        }

        let data: LocationOption[] = [];

        if (step === "district") {
          const { data: d, error } = await supabase.rpc("get_districts");
          if (error) throw error;
          data = d ?? [];
        }

        if (step === "town" && district) {
          const { data: d, error } = await supabase.rpc("get_towns", {
            p_district: district,
          });
          if (error) throw error;
          data = d ?? [];
        }

        if (step === "sub_county" && district && town) {
          const { data: d, error } = await supabase.rpc("get_sub_counties", {
            p_district: district,
            p_town: town,
          });
          if (error) throw error;
          data = d ?? [];
        }

        if (!active) return;

        setOptions(data);
        await setCachedList(cacheKey, data);
      } catch {
        if (!active) return;
        setOptions([]);
        setError("Could not load location options.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [step, district, town]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();

    return options.filter((o) =>
      (o.district || o.town || o.sub_county || "").toLowerCase().includes(q),
    );
  }, [query, options]);

  const alphaIndex = useMemo(() => {
    if (step !== "district") return {} as Record<string, number>;

    const map: Record<string, number> = {};

    filtered.forEach((o, i) => {
      const letter = o.district?.[0]?.toUpperCase();
      if (letter && map[letter] === undefined) {
        map[letter] = i;
      }
    });

    return map;
  }, [filtered, step]);

  const breadcrumb = useMemo(() => {
    if (step === "district") return "Start by choosing your district.";
    if (step === "town") return `District: ${district ?? "Unknown"}`;
    return `${district ?? "Unknown"} • ${town ?? "Unknown"}`;
  }, [district, step, town]);

  const itemLabel = useCallback(
    (item: LocationOption) =>
      item.district || item.town || item.sub_county || "",
    [],
  );

  const select = useCallback(
    async (item: LocationOption) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (step === "district") {
        setDistrict(item.district ?? null);
        setTown(null);
        setQuery("");
        setStep("town");
        return;
      }

      if (step === "town") {
        setTown(item.town ?? null);
        setQuery("");
        setStep("sub_county");
        return;
      }

      if (!item?.id || !district || !town || !item.sub_county) return;

      await setManualLocation({
        location_id: item.id,
        district,
        town,
        sub_county: item.sub_county,
      });

      await saveCachedLocation({
        location_id: item.id,
        district,
        town,
        sub_county: item.sub_county,
        source: "manual",
        lat: null,
        lng: null,
        resolved_at: Date.now(),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      navigation.reset({
        index: 0,
        routes: [{ name: "App" }],
      });
    },
    [district, navigation, step, town],
  );

  const goBack = useCallback(() => {
    if (step === "sub_county") {
      setStep("town");
      return;
    }

    if (step === "town") {
      setTown(null);
      setDistrict(null);
      setStep("district");
      return;
    }

    navigation.goBack();
  }, [navigation, step]);

  const renderItem: ListRenderItem<LocationOption> = useCallback(
    ({ item }) => (
      <Pressable onPress={() => void select(item)} style={rowCardStyle}>
        <AppCard variant="default">
          <View style={rowInnerStyle}>
            <View style={{ flex: 1 }}>
              <AppText variant="title">{itemLabel(item)}</AppText>
              <AppText variant="caption" tone="secondary">
                {step === "district"
                  ? "District"
                  : step === "town"
                    ? (district ?? "Town")
                    : `${district ?? ""}${town ? ` • ${town}` : ""}`}
              </AppText>
            </View>

            <AppText variant="labelLg" tone="primary" weight="700">
              Select
            </AppText>
          </View>
        </AppCard>
      </Pressable>
    ),
    [district, itemLabel, rowCardStyle, rowInnerStyle, select, step, town],
  );

  const showAlphaRail = step === "district" && filtered.length > 0 && !loading;

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item, i) => item.id ?? `${step}-${i}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={listContentStyle}
          ListHeaderComponent={
            <View style={contentStyle}>
              <AppHeader
                title="Choose Location"
                subtitle="Select the area you want AwoJobs to use for your local feed."
                onBackPress={goBack}
              />

              <View style={{ gap: theme.spacing.xs }}>
                <StatusBadge
                  label={getStepTitle(step)}
                  tone={step === "sub_county" ? "success" : "info"}
                />
                <AppText variant="bodySm" tone="secondary">
                  {breadcrumb}
                </AppText>
              </View>

              {detecting && step !== "district" ? (
                <InlineAlert
                  tone="info"
                  title="Location detected"
                  message="We detected your district to help you move faster. You can still change it."
                />
              ) : null}

              {error ? <InlineAlert tone="error" message={error} /> : null}

              <AppCard variant="elevated">
                <View style={searchCardStyle}>
                  <AppInput
                    label={
                      step === "district"
                        ? "Search district"
                        : step === "town"
                          ? "Search town"
                          : "Search sub-county"
                    }
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search..."
                  />

                  {step !== "district" ? (
                    <AppButton
                      title={
                        step === "town" ? "Change District" : "Back to Towns"
                      }
                      onPress={() => {
                        if (step === "town") {
                          setTown(null);
                          setDistrict(null);
                          setStep("district");
                        } else {
                          setStep("town");
                        }
                      }}
                      variant="secondary"
                    />
                  ) : null}
                </View>
              </AppCard>

              {loading ? (
                <View style={loaderWrapStyle}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <AppText variant="bodySm" tone="secondary">
                    Loading options...
                  </AppText>
                </View>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <EmptyState
                  title="No results found"
                  message={
                    query.trim()
                      ? "Try a different search term."
                      : "No location options are available right now."
                  }
                />
              ) : null}
            </View>
          }
          renderItem={renderItem}
        />

        {showAlphaRail ? (
          <View style={alphaRailStyle} pointerEvents="box-none">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
              <Pressable
                key={letter}
                onPress={() => {
                  const idx = alphaIndex[letter];
                  if (idx !== undefined) {
                    listRef.current?.scrollToIndex({
                      index: idx,
                      animated: true,
                    });
                  }
                }}
                style={alphaItemStyle}
              >
                <AppText variant="caption" tone="tertiary">
                  {letter}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ViewStyle,
} from "react";
import { View, ActivityIndicator, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../core/supabase";
import type { PickerLocation } from "../../ui/admin/LocationPicker";
import NumberField from "../../ui/admin/NumberField";
import TextAreaField from "../../ui/admin/TextAreaField";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppScreen } from "../../ui/AppScreen";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";

type DBLocation = {
  id: string;
  district: string | null;
  town: string | null;
  sub_county: string | null;
};

const MAX_JOBS_TOTAL = 200;

export default function AdminSeedJobsScreen() {
  const { theme } = useTheme();

  const [titles, setTitles] = useState(
    "Shop Attendant Needed\nCleaner Needed Immediately\nWaiter / Waitress Needed\nReceptionist Needed\nSalon Assistant Wanted",
  );

  const [descriptions, setDescriptions] = useState(
    "Looking for a reliable person ready to start immediately.\nMust be punctual, respectful and able to work well with customers.\nExperience is an added advantage but not required.",
  );

  const [jobsPerLocation, setJobsPerLocation] = useState("3");
  const [sponsoredRatio, setSponsoredRatio] = useState("0.2");
  const [contactPhone, setContactPhone] = useState("0700000000");

  const [locations, setLocations] = useState<PickerLocation[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const headerStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const badgeStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.radius.pill,
      theme.spacing.sm,
      theme.spacing.xs,
    ],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const summaryBoxStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.primary,
      theme.radius.lg,
      theme.spacing.md,
    ],
  );

  const loadingBoxStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 56,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.radius.lg,
      theme.spacing.sm,
    ],
  );

  const locationListStyle = useMemo<ViewStyle>(
    () => ({
      maxHeight: 260,
    }),
    [],
  );

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      setError(null);

      const { data, error } = await supabase
        .from("locations")
        .select("id,district,town,sub_county")
        .order("district", { ascending: true });

      if (error) throw error;

      const mapped: PickerLocation[] =
        (data as DBLocation[])?.map((l) => ({
          id: l.id,
          name: [l.district, l.town, l.sub_county].filter(Boolean).join(" • "),
        })) ?? [];

      setLocations(mapped);
    } catch {
      setError("Failed to load locations.");
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const selectedCount = selectedLocations.length;

  const totalToCreate = useMemo(() => {
    const jobs = Number(jobsPerLocation || 0);
    if (!jobs || !selectedCount) return 0;
    return jobs * selectedCount;
  }, [jobsPerLocation, selectedCount]);

  const toggleLocation = useCallback(
    (id: string) => {
      setSelectedLocations((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      if (error) setError(null);
    },
    [error],
  );

  const handleSeedJobs = useCallback(async () => {
    const titleLines = titles
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const descriptionLines = descriptions
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const jobsCount = Number(jobsPerLocation);
    const ratio = Number(sponsoredRatio);

    if (titleLines.length === 0) {
      setError("At least one title is required.");
      return;
    }

    if (descriptionLines.length === 0) {
      setError("At least one description is required.");
      return;
    }

    if (selectedLocations.length === 0) {
      setError("Select at least one location.");
      return;
    }

    if (!jobsCount || jobsCount < 1) {
      setError("Jobs per location must be at least 1.");
      return;
    }

    if (ratio < 0 || ratio > 1) {
      setError("Sponsored ratio must be between 0 and 1.");
      return;
    }

    if (totalToCreate > MAX_JOBS_TOTAL) {
      setError(
        `You are trying to create ${totalToCreate} jobs. Maximum allowed is ${MAX_JOBS_TOTAL}.`,
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc("admin_seed_jobs", {
        p_titles: titleLines,
        p_descriptions: descriptionLines,
        p_location_ids: selectedLocations,
        p_jobs_per_location: jobsCount,
        p_sponsored_ratio: ratio,
        p_contact_phone: contactPhone.trim() || null,
        p_contact_method: "phone",
        p_pay_type: "not_specified",
      });

      if (error) throw error;

      const createdCount = data?.created_count ?? totalToCreate;
      setError(null);

      // Keep fields as-is for quick reruns, just clear selections
      setSelectedLocations([]);

      // Success feedback inline through non-error alert component
      setError(`Created ${createdCount} jobs successfully.`);
    } catch (e: any) {
      setError(e?.message || "Failed to seed jobs.");
    } finally {
      setLoading(false);
    }
  }, [
    titles,
    descriptions,
    jobsPerLocation,
    sponsoredRatio,
    selectedLocations,
    totalToCreate,
    contactPhone,
  ]);

  const ctaLabel = loading
    ? "Generating..."
    : totalToCreate > 0
      ? `Generate ${totalToCreate} Jobs`
      : "Generate Jobs";

  const isSuccessMessage =
    error !== null &&
    error.toLowerCase().includes("created") &&
    error.toLowerCase().includes("successfully");

  return (
    <AppScreen scroll contentContainerStyle={contentStyle}>
      <View style={headerStyle}>
        <View style={badgeStyle}>
          <Ionicons
            name="layers-outline"
            size={14}
            color={theme.colors.primary}
          />
          <AppText variant="caption" tone="primary" weight="700">
            Bulk admin publishing
          </AppText>
        </View>

        <AppText variant="h1">Seed Jobs</AppText>

        <AppText variant="bodySm" tone="secondary">
          Generate multiple jobs across selected locations using reusable title
          and description templates.
        </AppText>
      </View>

      {error ? (
        <InlineAlert
          tone={isSuccessMessage ? "success" : "error"}
          message={error}
        />
      ) : null}

      <AppCard variant="elevated" padding="lg">
        <View style={cardContentStyle}>
          <TextAreaField
            label="Job Titles (one per line)"
            value={titles}
            onChangeText={(value) => {
              setTitles(value);
              if (error) setError(null);
            }}
            placeholder="Enter title templates..."
          />

          <TextAreaField
            label="Job Descriptions (one per line)"
            value={descriptions}
            onChangeText={(value) => {
              setDescriptions(value);
              if (error) setError(null);
            }}
            placeholder="Enter description templates..."
          />

          <NumberField
            label="Jobs Per Location"
            value={jobsPerLocation}
            onChangeText={(value) => {
              setJobsPerLocation(value);
              if (error) setError(null);
            }}
            placeholder="3"
          />

          <NumberField
            label="Sponsored Ratio (0 to 1)"
            value={sponsoredRatio}
            onChangeText={(value) => {
              setSponsoredRatio(value);
              if (error) setError(null);
            }}
            placeholder="0.2"
          />

          <NumberField
            label="Contact Phone"
            value={contactPhone}
            onChangeText={(value) => {
              setContactPhone(value);
              if (error) setError(null);
            }}
            placeholder="0700000000"
          />

          {loadingLocations ? (
            <View style={loadingBoxStyle}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <AppText variant="bodySm" weight="600" tone="secondary">
                Loading locations...
              </AppText>
            </View>
          ) : (
            <>
              <AppText variant="label" weight="700">
                Selected Locations
              </AppText>

              <View style={summaryBoxStyle}>
                <AppText
                  variant="bodySm"
                  weight="700"
                  style={{ color: theme.colors.primary }}
                >
                  {selectedCount} selected • {totalToCreate} jobs to create
                </AppText>
              </View>

              <ScrollView
                style={locationListStyle}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {locations.map((loc) => {
                  const active = selectedLocations.includes(loc.id);

                  return (
                    <Pressable
                      key={loc.id}
                      style={({ pressed }) => [
                        {
                          backgroundColor: active
                            ? theme.colors.primary
                            : theme.colors.bgSurface,
                          borderWidth: 1,
                          borderColor: active
                            ? theme.colors.primary
                            : theme.colors.borderDefault,
                          borderRadius: theme.radius.lg,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm + 2,
                          marginBottom: theme.spacing.sm,
                          opacity: pressed ? 0.92 : 1,
                        },
                      ]}
                      onPress={() => toggleLocation(loc.id)}
                    >
                      <AppText
                        variant="bodySm"
                        weight="600"
                        style={{
                          color: active
                            ? theme.colors.textInverse
                            : theme.colors.textPrimary,
                        }}
                      >
                        {loc.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <AppButton
            title={ctaLabel}
            onPress={handleSeedJobs}
            loading={loading}
            disabled={loading}
            variant="primary"
          />
        </View>
      </AppCard>
    </AppScreen>
  );
}

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ViewStyle,
} from "react";
import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../../core/supabase";
import type { AdminPostStackParamList } from "../../navigation/AdminPostNavigator";

import LocationPicker, {
  type PickerLocation,
} from "../../ui/admin/LocationPicker";
import ToggleField from "../../ui/admin/ToggleField";
import TextAreaField from "../../ui/admin/TextAreaField";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppScreen } from "../../ui/AppScreen";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";

type Props = NativeStackScreenProps<AdminPostStackParamList, "PostJob">;

type DBLocation = {
  id: string;
  district: string | null;
  town: string | null;
  sub_county: string | null;
};

export default function AdminPostJobScreen({ navigation }: Props) {
  const { theme } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [isSponsored, setIsSponsored] = useState(false);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<DBLocation[]>([]);

  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyboardWrapStyle = useMemo<ViewStyle>(() => ({ flex: 1 }), []);

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

  const sectionContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const fieldWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const inputStyle = useMemo(
    () => ({
      minHeight: 50,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: theme.spacing.md,
      fontSize: 15,
      color: theme.colors.textPrimary,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.colors.textPrimary,
      theme.radius.lg,
      theme.spacing.md,
    ],
  );

  const loadingBoxStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 56,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurfaceElevated,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.radius.lg,
      theme.spacing.md,
      theme.spacing.sm,
    ],
  );

  const actionsStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      setError(null);

      const { data, error } = await supabase
        .from("locations")
        .select("id,district,town,sub_county")
        .order("district", { ascending: true })
        .limit(2000);

      if (error) throw error;

      setLocations((data ?? []) as DBLocation[]);
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

  const mappedLocations: PickerLocation[] = useMemo(() => {
    return locations.map((l) => ({
      id: l.id,
      name: [l.district, l.town, l.sub_county].filter(Boolean).join(" • "),
    }));
  }, [locations]);

  const titleError = useMemo(() => {
    if (!title) return null;
    if (title.trim().length < 4) return "Job title is too short.";
    return null;
  }, [title]);

  const descriptionError = useMemo(() => {
    if (!description) return null;
    if (description.trim().length < 10) return "Job description is too short.";
    return null;
  }, [description]);

  const validateForm = useCallback(() => {
    if (!title.trim()) {
      setError("Job title is required.");
      return false;
    }

    if (title.trim().length < 4) {
      setError("Job title is too short.");
      return false;
    }

    if (!description.trim()) {
      setError("Job description is required.");
      return false;
    }

    if (description.trim().length < 10) {
      setError("Job description is too short.");
      return false;
    }

    if (!locationId) {
      setError("Location is required.");
      return false;
    }

    setError(null);
    return true;
  }, [title, description, locationId]);

  const handlePostJob = useCallback(async () => {
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc("admin_post_job", {
        p_title: title.trim(),
        p_description: description.trim(),
        p_location_id: locationId,
        p_is_sponsored: isSponsored,
      });

      if (error) throw error;

      setTitle("");
      setDescription("");
      setContactPhone("");
      setIsSponsored(false);
      setLocationId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to post admin job.");
    } finally {
      setLoading(false);
    }
  }, [description, isSponsored, loading, locationId, title, validateForm]);

  return (
    <KeyboardAvoidingView
      style={keyboardWrapStyle}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <AppScreen scroll>
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={headerStyle}>
            <View style={badgeStyle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={theme.colors.primary}
              />
              <AppText variant="caption" tone="primary" weight="700">
                Admin publishing
              </AppText>
            </View>

            <AppText variant="h1">Post Job</AppText>

            <AppText variant="bodySm" tone="secondary">
              Publish jobs directly to the platform feed with location targeting
              and optional sponsorship.
            </AppText>
          </View>

          {error ? <InlineAlert tone="error" message={error} /> : null}

          <AppCard variant="elevated" padding="lg">
            <View style={sectionContentStyle}>
              <AppText variant="labelLg" weight="800">
                Job Information
              </AppText>

              <View style={fieldWrapStyle}>
                <AppText variant="label" weight="700">
                  Job Title
                </AppText>
                <TextInput
                  value={title}
                  onChangeText={(value) => {
                    setTitle(value);
                    if (error) setError(null);
                  }}
                  placeholder="Shop Attendant Needed"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                />
                {titleError ? (
                  <AppText variant="caption" tone="error">
                    {titleError}
                  </AppText>
                ) : null}
              </View>

              <TextAreaField
                label="Job Description"
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  if (error) setError(null);
                }}
                placeholder="Enter detailed job description..."
              />

              {descriptionError ? (
                <AppText variant="caption" tone="error">
                  {descriptionError}
                </AppText>
              ) : null}

              <View style={fieldWrapStyle}>
                <AppText variant="label" weight="700">
                  Contact Phone
                </AppText>
                <TextInput
                  value={contactPhone}
                  onChangeText={(value) => {
                    setContactPhone(value);
                    if (error) setError(null);
                  }}
                  placeholder="0700000000"
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                />
              </View>
            </View>
          </AppCard>

          <AppCard variant="elevated" padding="lg">
            <View style={sectionContentStyle}>
              <AppText variant="labelLg" weight="800">
                Visibility & Targeting
              </AppText>

              <ToggleField
                label="Sponsored Job"
                value={isSponsored}
                onValueChange={(value) => {
                  setIsSponsored(value);
                  if (error) setError(null);
                }}
              />

              {loadingLocations ? (
                <View style={loadingBoxStyle}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                  <AppText variant="bodySm" tone="secondary" weight="600">
                    Loading locations...
                  </AppText>
                </View>
              ) : (
                <LocationPicker
                  label="Job Location"
                  locations={mappedLocations}
                  selectedId={locationId}
                  onSelect={(value) => {
                    setLocationId(value);
                    if (error) setError(null);
                  }}
                />
              )}
            </View>
          </AppCard>

          <View style={actionsStyle}>
            <AppButton
              title="Publish Job"
              onPress={handlePostJob}
              loading={loading}
              disabled={loading || !locationId}
              variant="primary"
            />

            <AppButton
              title="Open Job Seeder"
              onPress={() => navigation.navigate("SeedJobs")}
              variant="secondary"
            />
          </View>
        </ScrollView>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

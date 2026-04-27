import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ViewStyle,
} from "react";
import { View } from "react-native";

import { supabase } from "../../core/supabase";
import { resolveLocation } from "../../location/location.service";
import { updateJob } from "../../jobs/jobs.update";
import { PostingSuccessPrompt } from "../../ui/components/PostingSuccessPrompt";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppInput } from "../../ui/AppInput";
import { AppButton } from "../../ui/AppButton";
import { AppCard } from "../../ui/AppCard";
import { FilterChip } from "../../ui/FilterChip";
import { InlineAlert } from "../../ui/InlineAlert";

type ContactMethod = "call" | "whatsapp" | "walk_in" | "in_app";
type PayType = "daily" | "weekly" | "monthly" | "not_specified";

type EditingJob = {
  id?: string;
  title?: string | null;
  description?: string | null;
  pay_type?: PayType | null;
  contact_method?: ContactMethod | null;
  contact_phone?: string | null;
  location_id?: string | null;
  district?: string | null;
  town?: string | null;
  sub_county?: string | null;
  location_name?: string | null;
};

type Props = {
  navigation: any;
  route: {
    params?: {
      job?: EditingJob;
      jobId?: string;
      mode?: "create" | "edit" | "renew";
    };
  };
};

function formatLocationName(loc: {
  district?: string | null;
  town?: string | null;
  sub_county?: string | null;
}) {
  return [loc.sub_county, loc.town, loc.district].filter(Boolean).join(", ");
}

function formatPayTypeLabel(value: PayType) {
  if (value === "not_specified") return "Not specified";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatContactMethodLabel(value: ContactMethod) {
  if (value === "walk_in") return "Walk in";
  if (value === "in_app") return "In app";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("256") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+256${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 9) {
    return `+256${digits}`;
  }

  return input.trim();
}

function isValidUgPhone(input: string) {
  return /^\+256\d{9}$/.test(normalizePhone(input));
}

export default function PostJobScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { job: editingJob, jobId, mode = "create" } = route?.params ?? {};

  const isEdit = mode === "edit";
  const isRenew = mode === "renew";
  const isCreate = !isEdit && !isRenew;

  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  const [title, setTitle] = useState(editingJob?.title ?? "");
  const [description, setDescription] = useState(editingJob?.description ?? "");
  const [payType, setPayType] = useState<PayType>(
    editingJob?.pay_type ?? "not_specified",
  );
  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    editingJob?.contact_method ?? "call",
  );
  const [phone, setPhone] = useState(editingJob?.contact_phone ?? "");

  const [loading, setLoading] = useState(false);
  const [postedJob, setPostedJob] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldDisabled = isRenew;

  useEffect(() => {
    let active = true;

    const loadLocation = async () => {
      if (editingJob) {
        if (!active) return;

        setLocationId(editingJob.location_id ?? null);
        setLocationName(
          formatLocationName({
            district: editingJob.district ?? null,
            town: editingJob.town ?? null,
            sub_county: editingJob.sub_county ?? null,
          }) ||
            editingJob.location_name ||
            null,
        );
        return;
      }

      try {
        const loc = await resolveLocation();
        if (!active) return;

        if (!loc?.location_id) {
          setLocationId(null);
          setLocationName(null);
          return;
        }

        setLocationId(loc.location_id);
        setLocationName(
          formatLocationName({
            district: loc.district ?? null,
            town: loc.town ?? null,
            sub_county: loc.sub_county ?? null,
          }) || null,
        );
      } catch {
        if (!active) return;
        setLocationId(null);
        setLocationName(null);
      }
    };

    void loadLocation();

    return () => {
      active = false;
    };
  }, [editingJob]);

  useEffect(() => {
    let active = true;

    if (editingJob || phone) return;

    supabase
      .from("profiles")
      .select("phone_number")
      .single()
      .then(({ data, error: profileError }) => {
        if (!active || profileError) return;
        if (
          typeof data?.phone_number === "string" &&
          data.phone_number.trim()
        ) {
          setPhone(data.phone_number);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [editingJob, phone]);

  const titleError = useMemo(() => {
    if (!title) return null;
    if (title.trim().length < 4) return "Title must be at least 4 characters.";
    return null;
  }, [title]);

  const phoneError = useMemo(() => {
    if (contactMethod === "walk_in" || contactMethod === "in_app") return null;
    if (!phone) return null;
    if (!isValidUgPhone(phone)) return "Use a valid Uganda phone number.";
    return null;
  }, [contactMethod, phone]);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const sectionCardStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const chipRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const footerSpaceStyle = useMemo<ViewStyle>(
    () => ({
      height: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const validateBeforeSubmit = useCallback(() => {
    if (!locationId) {
      setError("Turn on location to continue posting this job.");
      return false;
    }

    if (!isRenew && title.trim().length < 4) {
      setError("Job title must be at least 4 characters.");
      return false;
    }

    if (
      !isRenew &&
      contactMethod !== "walk_in" &&
      contactMethod !== "in_app" &&
      !phone.trim()
    ) {
      setError("Contact phone is required.");
      return false;
    }

    if (
      !isRenew &&
      contactMethod !== "walk_in" &&
      contactMethod !== "in_app" &&
      !isValidUgPhone(phone)
    ) {
      setError("Use a valid Uganda phone number.");
      return false;
    }

    setError(null);
    return true;
  }, [contactMethod, isRenew, locationId, phone, title]);

  const submitEdit = useCallback(async () => {
    if (!jobId) {
      setError("Missing job id.");
      return;
    }

    if (!validateBeforeSubmit()) return;

    setLoading(true);
    setError(null);

    try {
      const saved = await updateJob(jobId, {
        title: title.trim(),
        description: description.trim() || "",
        pay_type: payType,
        contact_method: contactMethod,
        contact_phone:
          contactMethod === "walk_in" || contactMethod === "in_app"
            ? null
            : normalizePhone(phone),
      });

      setPostedJob(saved);
    } catch (e: any) {
      setError(e?.message ?? "Could not save changes.");
    } finally {
      setLoading(false);
    }
  }, [
    contactMethod,
    description,
    jobId,
    payType,
    phone,
    title,
    validateBeforeSubmit,
  ]);

  const submitRenew = useCallback(async () => {
    if (!jobId) {
      setError("Missing job id.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      navigation.navigate("Payment", {
        draftId: jobId,
        mode: "renew",
        jobId,
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not start renewal.");
    } finally {
      setLoading(false);
    }
  }, [jobId, navigation]);

  const submitCreate = useCallback(async () => {
    if (!validateBeforeSubmit()) return;

    setLoading(true);
    setError(null);

    try {
      const draftPayload = {
        title: title.trim(),
        description: description.trim() || "",
        pay_type: payType,
        contact_method: contactMethod,
        contact_phone:
          contactMethod === "walk_in" || contactMethod === "in_app"
            ? null
            : normalizePhone(phone),
        location_id: locationId,
        status: "draft" as const,
      };

      const { data, error: insertError } = await supabase
        .from("jobs")
        .insert(draftPayload)
        .select()
        .single();

      if (insertError || !data) {
        throw insertError ?? new Error("Could not create draft.");
      }

      navigation.navigate("Payment", {
        draftId: data.id,
        mode: "create",
        jobId: data.id,
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not create draft.");
    } finally {
      setLoading(false);
    }
  }, [
    contactMethod,
    description,
    locationId,
    navigation,
    payType,
    phone,
    title,
    validateBeforeSubmit,
  ]);

  const continueFlow = useCallback(async () => {
    if (loading) return;

    if (isEdit) {
      await submitEdit();
      return;
    }

    if (isRenew) {
      await submitRenew();
      return;
    }

    await submitCreate();
  }, [isEdit, isRenew, loading, submitCreate, submitEdit, submitRenew]);

  if (postedJob) {
    return (
      <PostingSuccessPrompt
        job={postedJob}
        onDone={() => navigation.popToTop()}
      />
    );
  }

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title={isEdit ? "Edit Job" : isRenew ? "Renew Job" : "Post a Job"}
          subtitle={
            isEdit
              ? "Update your job details and save changes."
              : isRenew
                ? "Review the job and continue to payment."
                : "Create a draft first, then complete payment before it goes live."
          }
        />

        {locationName && !isEdit ? (
          <InlineAlert
            tone="info"
            title="Posting location"
            message={`This job will be posted in ${locationName}.`}
          />
        ) : null}

        {!locationId && isCreate ? (
          <InlineAlert
            tone="warning"
            title="Location required"
            message="Turn on location to continue posting this job."
          />
        ) : null}

        {isRenew ? (
          <InlineAlert
            tone="warning"
            title="Renewal mode"
            message="Job details are locked during renewal. Continue to payment to reactivate the listing."
          />
        ) : null}

        {!isEdit ? (
          <InlineAlert
            tone="info"
            title="Before your job goes live"
            message="AwoJobs saves this as a draft first. You will complete payment before publishing."
          />
        ) : null}

        {error ? <InlineAlert tone="error" message={error} /> : null}

        <AppCard variant="elevated">
          <View style={sectionCardStyle}>
            <AppText variant="titleLg">Job details</AppText>

            <AppInput
              label="Job title"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (error) setError(null);
              }}
              editable={!fieldDisabled}
              placeholder="Enter the job title"
              hint="Use a clear title applicants will immediately understand."
              error={titleError ?? undefined}
            />

            <AppInput
              label="Job description"
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (error) setError(null);
              }}
              editable={!fieldDisabled}
              placeholder="Describe the role, duties, and expectations"
              multiline
              hint="Keep it clear and practical. Mention what the worker will actually do."
            />
          </View>
        </AppCard>

        <AppCard variant="elevated">
          <View style={sectionCardStyle}>
            <AppText variant="titleLg">Pay type</AppText>

            <View style={chipRowStyle}>
              {(["daily", "weekly", "monthly", "not_specified"] as const).map(
                (option) => (
                  <FilterChip
                    key={option}
                    label={formatPayTypeLabel(option)}
                    selected={payType === option}
                    disabled={fieldDisabled}
                    onPress={() => {
                      setPayType(option);
                      if (error) setError(null);
                    }}
                  />
                ),
              )}
            </View>
          </View>
        </AppCard>

        <AppCard variant="elevated">
          <View style={sectionCardStyle}>
            <AppText variant="titleLg">Application method</AppText>

            <View style={chipRowStyle}>
              {(["call", "whatsapp", "in_app", "walk_in"] as const).map(
                (method) => (
                  <FilterChip
                    key={method}
                    label={formatContactMethodLabel(method)}
                    selected={contactMethod === method}
                    disabled={fieldDisabled}
                    onPress={() => {
                      setContactMethod(method);
                      if (error) setError(null);
                    }}
                  />
                ),
              )}
            </View>

            {contactMethod !== "walk_in" && contactMethod !== "in_app" ? (
              <AppInput
                label="Contact phone"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  if (error) setError(null);
                }}
                editable={!fieldDisabled}
                keyboardType="phone-pad"
                placeholder="07XXXXXXXX"
                hint="Use a valid Uganda phone number."
                error={phoneError ?? undefined}
              />
            ) : (
              <InlineAlert
                tone="info"
                message={
                  contactMethod === "in_app"
                    ? "Applicants will submit their details through AwoJobs."
                    : "Applicants will be expected to visit the employer in person."
                }
              />
            )}
          </View>
        </AppCard>

        <AppButton
          title={isEdit ? "Save Changes" : "Continue to Payment"}
          onPress={continueFlow}
          loading={loading}
          disabled={loading || (isCreate && !locationId)}
          variant="primary"
        />

        <View style={footerSpaceStyle} />
      </View>
    </AppScreen>
  );
}

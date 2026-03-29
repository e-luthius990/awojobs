import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ViewStyle,
} from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { SkeletonCard } from "../../ui/Skeleton";

type UserRole = "employer" | "job_seeker" | "moderator" | "super_admin";

type ModeratorUser = {
  id: string;
  full_name: string | null;
  role: UserRole | null;
  trust_score: number | null;
  is_suspended: boolean | null;
  created_at: string;
};

export default function ModeratorUsersScreen() {
  const { theme } = useTheme();

  const [users, setUsers] = useState<ModeratorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,role,trust_score,is_suspended,created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("ModeratorUsersScreen load failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      setUsers((data ?? []) as ModeratorUser[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load users.");
      if (!silent) setUsers([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSuspend = useCallback(async (user: ModeratorUser) => {
    try {
      setActionLoadingId(user.id);
      setError(null);

      const next = !Boolean(user.is_suspended);

      const { data, error } = await supabase
        .from("profiles")
        .update({ is_suspended: next })
        .eq("id", user.id)
        .select("id,is_suspended")
        .maybeSingle();

      if (error) {
        console.error("toggleSuspend failed", {
          userId: user.id,
          next,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      if (!data) {
        throw new Error("User not updated");
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_suspended: data.is_suspended } : u,
        ),
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update user.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const loadingWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.sm,
    }),
    [theme.spacing.md, theme.spacing.xxxl, theme.spacing.sm],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loadingWrapStyle}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
            }}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <AppText variant="bodySm" tone="secondary">
              Loading users...
            </AppText>
          </View>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!users.length && error) {
    return (
      <AppScreen centerContent>
        <EmptyState title="Users unavailable" message={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            style={{ gap: theme.spacing.md, marginBottom: theme.spacing.sm }}
          >
            <AppText variant="h2" weight="700">
              Users
            </AppText>

            {error ? <InlineAlert tone="error" message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No users found"
            message="There are no users to show right now."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <UserCard
            item={item}
            busy={actionLoadingId === item.id}
            onToggleSuspend={() => void toggleSuspend(item)}
          />
        )}
      />
    </AppScreen>
  );
}

function UserCard({
  item,
  busy,
  onToggleSuspend,
}: {
  item: ModeratorUser;
  busy: boolean;
  onToggleSuspend: () => void;
}) {
  const { theme } = useTheme();

  const suspended = Boolean(item.is_suspended);
  const isSuperAdmin = item.role === "super_admin";

  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <AppCard variant="elevated" padding="lg">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="bodySm" weight="700">
            {item.full_name ?? "Unknown User"}
          </AppText>

          <AppText variant="caption" tone="secondary">
            Role: {item.role ?? "unknown"} • Trust: {item.trust_score ?? 0}
          </AppText>

          <AppText
            variant="caption"
            weight="700"
            tone={suspended ? "error" : "success"}
          >
            {suspended ? "Suspended" : "Active"}
          </AppText>

          <View style={{ marginTop: theme.spacing.xs }}>
            <AppButton
              title={
                isSuperAdmin ? "Protected" : suspended ? "Unsuspend" : "Suspend"
              }
              onPress={onToggleSuspend}
              loading={busy}
              disabled={busy || isSuperAdmin}
              size="sm"
              fullWidth={false}
              variant={
                isSuperAdmin ? "ghost" : suspended ? "secondary" : "destructive"
              }
            />
          </View>
        </View>
      </AppCard>
    </View>
  );
}

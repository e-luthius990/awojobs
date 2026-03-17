import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ViewStyle,
} from "react";
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../core/supabase";
import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppScreen } from "../../ui/AppScreen";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { AppButton } from "../../ui/AppButton";
import { SkeletonCard } from "../../ui/Skeleton";

type AdminUser = {
  id: string;
  full_name: string | null;
  role: "job_seeker" | "employer" | "moderator" | "super_admin" | null;
  trust_score: number | null;
  is_suspended: boolean | null;
  created_at: string;
};

type FilterKey =
  | "all"
  | "employer"
  | "job_seeker"
  | "moderator"
  | "super_admin"
  | "suspended";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "job_seeker", label: "Job Seekers" },
  { key: "employer", label: "Employers" },
  { key: "moderator", label: "Moderators" },
  { key: "super_admin", label: "Admins" },
  { key: "suspended", label: "Suspended" },
];

const PAGE_SIZE = 50;

export default function AdminUsersScreen() {
  const { theme } = useTheme();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const cursorRef = useRef<{ created_at: string; id: string } | null>(null);
  const inFlightRef = useRef(false);
  const queryKeyRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const buildBaseQuery = useCallback(() => {
    let query = supabase
      .from("profiles")
      .select("id,full_name,role,trust_score,is_suspended,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);

    if (filter === "suspended") {
      query = query.eq("is_suspended", true);
    } else if (filter !== "all") {
      query = query.eq("role", filter);
    }

    if (debouncedSearch) {
      query = query.ilike("full_name", `%${debouncedSearch}%`);
    }

    return query;
  }, [debouncedSearch, filter]);

  const loadFirstPage = useCallback(
    async (silent = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const myKey = queryKeyRef.current;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const { data, error } = await buildBaseQuery();

        if (myKey !== queryKeyRef.current) return;
        if (error) throw error;

        const list = (data ?? []) as AdminUser[];
        setUsers(list);

        if (list.length < PAGE_SIZE) {
          setHasMore(false);
          cursorRef.current = null;
        } else {
          const last = list[list.length - 1];
          cursorRef.current = { created_at: last.created_at, id: last.id };
          setHasMore(true);
        }
      } catch {
        if (myKey === queryKeyRef.current) {
          setError("Failed to load users.");
          if (!silent) setUsers([]);
        }
      } finally {
        if (myKey === queryKeyRef.current) {
          if (!silent) setLoading(false);
          setRefreshing(false);
        }
        inFlightRef.current = false;
      }
    },
    [buildBaseQuery],
  );

  const loadNextPage = useCallback(async () => {
    if (!hasMore || inFlightRef.current || !cursorRef.current) return;

    inFlightRef.current = true;
    setFetchingMore(true);

    const myKey = queryKeyRef.current;

    try {
      const cur = cursorRef.current;

      let query = buildBaseQuery().limit(PAGE_SIZE);

      query = query.or(
        `created_at.lt.${cur.created_at},and(created_at.eq.${cur.created_at},id.lt.${cur.id})`,
      );

      const { data, error } = await query;
      if (myKey !== queryKeyRef.current) return;
      if (error) throw error;

      const next = (data ?? []) as AdminUser[];

      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        const merged = [...prev];
        for (const u of next) {
          if (!seen.has(u.id)) merged.push(u);
        }
        return merged;
      });

      if (next.length < PAGE_SIZE) {
        setHasMore(false);
        cursorRef.current = null;
      } else {
        const last = next[next.length - 1];
        cursorRef.current = { created_at: last.created_at, id: last.id };
        setHasMore(true);
      }
    } catch {
      if (myKey === queryKeyRef.current) {
        setError("Failed to load more users.");
      }
    } finally {
      if (myKey === queryKeyRef.current) setFetchingMore(false);
      inFlightRef.current = false;
    }
  }, [buildBaseQuery, hasMore]);

  useEffect(() => {
    queryKeyRef.current += 1;
    cursorRef.current = null;
    setUsers([]);
    setHasMore(true);
    void loadFirstPage();
  }, [filter, debouncedSearch, loadFirstPage]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current);
          }
          realtimeDebounceRef.current = setTimeout(() => {
            void loadFirstPage(true);
          }, 600);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
    };
  }, [loadFirstPage]);

  const toggleSuspend = useCallback(async (user: AdminUser) => {
    const next = !Boolean(user.is_suspended);
    setActionLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: next })
        .eq("id", user.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_suspended: next } : u)),
      );
      setActionUser(null);
    } catch {
      setError("Failed to update suspension.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const toggleModerator = useCallback(async (user: AdminUser) => {
    const newRole = user.role === "moderator" ? "job_seeker" : "moderator";
    setActionLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
      );
      setActionUser(null);
    } catch {
      setError("Failed to update role.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (user: AdminUser) => {
    setActionLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setActionUser(null);
    } catch {
      setError("Failed to delete profile.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.md,
    }),
    [theme.spacing.xxxl, theme.spacing.md],
  );

  const utilityCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const searchWrapStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      gap: theme.spacing.sm,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.spacing.md,
      theme.radius.lg,
      theme.spacing.sm,
    ],
  );

  const searchInputStyle = useMemo(
    () => ({
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      paddingVertical: 0,
    }),
    [theme.colors.textPrimary],
  );

  const filterScrollContentStyle = useMemo(
    () => ({
      paddingRight: theme.spacing.xs,
      gap: theme.spacing.sm,
    }),
    [theme.spacing.xs, theme.spacing.sm],
  );

  const emptyWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    }),
    [theme.spacing.xl],
  );

  const loadingWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    }),
    [theme.spacing.lg, theme.spacing.md],
  );

  const loadingRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const modalBackdropStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
    }),
    [],
  );

  const modalWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "flex-end",
      padding: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const modalSheetStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurface,
      borderRadius: 20,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      gap: theme.spacing.xs,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.spacing.md,
      theme.spacing.xs,
    ],
  );

  const listEmpty = loading ? null : users.length === 0 ? (
    <View style={emptyWrapStyle}>
      <EmptyState
        title="No users found"
        message="Try another filter or search."
      />
    </View>
  ) : null;

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loadingWrapStyle}>
          <View style={loadingRowStyle}>
            <ActivityIndicator color={theme.colors.primary} />
            <AppText variant="bodySm" tone="secondary" weight="600">
              Loading users...
            </AppText>
          </View>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={contentStyle}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md }}>
            {error ? <InlineAlert tone="error" message={error} /> : null}

            <AppCard variant="elevated" padding="lg">
              <View style={utilityCardContentStyle}>
                <View style={searchWrapStyle}>
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                  <TextInput
                    placeholder="Search by name..."
                    value={search}
                    onChangeText={setSearch}
                    style={searchInputStyle}
                    placeholderTextColor={theme.colors.textMuted}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={filterScrollContentStyle}
                >
                  {FILTERS.map((f) => {
                    const active = filter === f.key;

                    return (
                      <Pressable
                        key={f.key}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: theme.spacing.md,
                            paddingVertical: 8,
                            borderRadius: theme.radius.pill,
                            borderWidth: 1,
                            borderColor: active
                              ? theme.colors.primary
                              : theme.colors.borderDefault,
                            backgroundColor: active
                              ? theme.colors.primary
                              : theme.colors.bgSurface,
                            opacity: pressed ? 0.92 : 1,
                          },
                        ]}
                        onPress={() => setFilter(f.key)}
                      >
                        <AppText
                          variant="caption"
                          weight="800"
                          tone={active ? "inverse" : "secondary"}
                        >
                          {f.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </AppCard>
          </View>
        }
        renderItem={({ item }) => (
          <UserCard user={item} onMore={() => setActionUser(item)} />
        )}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          <Footer
            fetchingMore={fetchingMore}
            hasMore={hasMore}
            count={users.length}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              queryKeyRef.current += 1;
              cursorRef.current = null;
              setHasMore(true);
              void loadFirstPage(true);
            }}
            tintColor={theme.colors.primary}
          />
        }
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          if (!fetchingMore) void loadNextPage();
        }}
        showsVerticalScrollIndicator={false}
      />

      {actionUser ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!actionLoading) setActionUser(null);
          }}
        >
          <Pressable
            style={modalBackdropStyle}
            onPress={() => {
              if (!actionLoading) setActionUser(null);
            }}
          />

          <View style={modalWrapStyle}>
            <View style={modalSheetStyle}>
              <AppText variant="labelLg" weight="800">
                {actionUser.full_name ?? "User"}
              </AppText>

              <AppButton
                title={actionUser.is_suspended ? "Unsuspend" : "Suspend"}
                onPress={() => void toggleSuspend(actionUser)}
                loading={actionLoading}
                disabled={actionLoading}
                variant="secondary"
              />

              <AppButton
                title={
                  actionUser.role === "moderator"
                    ? "Demote Moderator"
                    : "Make Moderator"
                }
                onPress={() => void toggleModerator(actionUser)}
                loading={actionLoading}
                disabled={actionLoading}
                variant="secondary"
              />

              <AppButton
                title="Delete Profile"
                onPress={() => void deleteUser(actionUser)}
                loading={actionLoading}
                disabled={actionLoading}
                variant="destructive"
              />

              <AppButton
                title="Cancel"
                onPress={() => setActionUser(null)}
                disabled={actionLoading}
                variant="ghost"
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </AppScreen>
  );
}

function UserCard({ user, onMore }: { user: AdminUser; onMore: () => void }) {
  const { theme } = useTheme();

  const name = user.full_name ?? "Unknown";
  const role = user.role ?? "unknown";

  const badgeColor =
    role === "super_admin"
      ? theme.colors.primary
      : role === "moderator"
        ? theme.colors.success
        : role === "employer"
          ? theme.colors.warning
          : role === "job_seeker"
            ? (theme.colors.info ?? theme.colors.primary)
            : theme.colors.textMuted;

  const cardWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const leftStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const badgeRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  return (
    <View style={cardWrapStyle}>
      <AppCard variant="elevated" padding="lg">
        <View style={cardContentStyle}>
          <View style={leftStyle}>
            <AppText variant="bodySm" weight="800">
              {name}
            </AppText>

            <View style={badgeRowStyle}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: badgeColor,
                }}
              />
              <AppText variant="caption" weight="800" tone="secondary">
                {String(role).toUpperCase()}
                {user.is_suspended ? " • SUSPENDED" : ""}
              </AppText>
            </View>

            <AppText variant="caption" tone="secondary">
              Joined: {new Date(user.created_at).toLocaleDateString()}
            </AppText>
          </View>

          <Pressable onPress={onMore} hitSlop={12}>
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        </View>
      </AppCard>
    </View>
  );
}

function Footer({
  fetchingMore,
  hasMore,
  count,
}: {
  fetchingMore: boolean;
  hasMore: boolean;
  count: number;
}) {
  const { theme } = useTheme();

  const footerStyle = useMemo<ViewStyle>(
    () => ({
      paddingVertical: theme.spacing.lg,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.lg, theme.spacing.xs],
  );

  if (fetchingMore) {
    return (
      <View style={footerStyle}>
        <ActivityIndicator color={theme.colors.primary} />
        <AppText variant="caption" tone="secondary" weight="700">
          Loading more...
        </AppText>
      </View>
    );
  }

  if (!hasMore) {
    return (
      <View style={footerStyle}>
        <AppText variant="caption" tone="secondary" weight="700">
          End • {count} users
        </AppText>
      </View>
    );
  }

  return <View style={{ height: 8 }} />;
}

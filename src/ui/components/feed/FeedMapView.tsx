import React, { useMemo, useRef, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import MapView, { Marker, Circle, Region } from "react-native-maps";

import { AppScreen } from "../../AppScreen";
import { AppCard } from "../../AppCard";
import { AppText } from "../../AppText";
import { AppButton } from "../../AppButton";
import { SegmentedControl } from "../../SegmentedControl";
import { EmptyState } from "../../EmptyState";

type MapItem = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  display_label: string | null;
  resolution_level: "exact_local" | "area_local" | "district_only" | null;
  map_visibility_mode:
    | "exact_pin"
    | "offset_pin"
    | "area_circle"
    | "district_anchor"
    | "hidden"
    | null;
  radius_meters?: number | null;
  location_id?: string | null;
  district_id?: string | null;
};

type Props = {
  navigation: any;
  items: MapItem[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  requestedScope: "local" | "national";
  effectiveScope: "local" | "national";
  setRequestedScope: (scope: "local" | "national") => void;
  viewMode: "list" | "map";
  setViewMode: (mode: "list" | "map") => void;
  isGuest: boolean;
  isPremium: boolean;
  isNationalLocked: boolean;
  onOpenPremium: () => void;
  locationRequired: boolean;
  onRetryLocation: () => void;
  locationLabel: string | null;
  region: Region | null;
  onRegionChangeComplete: (region: Region) => void;
};

type AreaGroupedNode =
  | {
      kind: "single";
      item: MapItem;
      latitude: number;
      longitude: number;
    }
  | {
      kind: "group";
      key: string;
      items: MapItem[];
      latitude: number;
      longitude: number;
      label: string | null;
    };

const FALLBACK_REGION: Region = {
  latitude: 0.3476,
  longitude: 32.5825,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function CompactViewModeToggle({
  value,
  onChange,
}: {
  value: "list" | "map";
  onChange: (value: "list" | "map") => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "flex-start",
        backgroundColor: "#F1F5F9",
        borderRadius: 999,
        padding: 3,
        gap: 4,
      }}
    >
      {(
        [
          { key: "list", label: "List" },
          { key: "map", label: "Map" },
        ] as const
      ).map((item) => {
        const active = value === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              minWidth: 58,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "#FFFFFF" : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? "#CBD5E1" : "transparent",
            }}
          >
            <AppText
              variant="captionSm"
              weight="700"
              style={{ color: active ? "#0F172A" : "#64748B" }}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildAreaKey(item: MapItem) {
  if (item.location_id) return `location:${item.location_id}`;
  if (item.district_id) return `district:${item.district_id}`;

  const lat = Number(item.latitude).toFixed(4);
  const lng = Number(item.longitude).toFixed(4);
  return `coord:${lat}:${lng}`;
}

function groupJobsByArea(items: MapItem[]): AreaGroupedNode[] {
  const visible = items.filter(
    (item) =>
      item.map_visibility_mode !== "hidden" &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude),
  );

  const buckets = new Map<string, MapItem[]>();

  for (const item of visible) {
    const key = buildAreaKey(item);
    const existing = buckets.get(key);
    if (existing) existing.push(item);
    else buckets.set(key, [item]);
  }

  const result: AreaGroupedNode[] = [];

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.length === 1) {
      const item = bucket[0];
      result.push({
        kind: "single",
        item,
        latitude: item.latitude,
        longitude: item.longitude,
      });
      continue;
    }

    const latitude =
      bucket.reduce((sum, item) => sum + item.latitude, 0) / bucket.length;
    const longitude =
      bucket.reduce((sum, item) => sum + item.longitude, 0) / bucket.length;

    result.push({
      kind: "group",
      key,
      items: bucket,
      latitude,
      longitude,
      label: bucket[0]?.display_label ?? null,
    });
  }

  return result;
}

function AreaCountMarker({ count }: { count: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          minWidth: 52,
          height: 52,
          borderRadius: 999,
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2563EB",
          borderWidth: 3,
          borderColor: "#FFFFFF",
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <AppText variant="caption" weight="700" style={{ color: "#FFFFFF" }}>
          {count}
        </AppText>
      </View>

      <View
        style={{
          marginTop: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.96)",
          borderWidth: 1,
          borderColor: "#D7DFEA",
        }}
      >
        <AppText variant="captionSm" weight="700" style={{ color: "#0F172A" }}>
          {count} {count === 1 ? "job" : "jobs"}
        </AppText>
      </View>
    </View>
  );
}

export default function FeedMapView({
  navigation,
  items,
  loading,
  error,
  refreshing,
  refresh,
  requestedScope,
  setRequestedScope,
  viewMode,
  setViewMode,
  isGuest,
  isNationalLocked,
  onOpenPremium,
  locationRequired,
  onRetryLocation,
  locationLabel,
  region,
  onRegionChangeComplete,
}: Props) {
  const lastRegionRef = useRef<Region | null>(null);
  const suppressNextMapPressRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const groupedItems = useMemo(() => groupJobsByArea(items), [items]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupKey) return null;

    return (
      groupedItems.find(
        (node): node is Extract<AreaGroupedNode, { kind: "group" }> =>
          node.kind === "group" && node.key === selectedGroupKey,
      ) ?? null
    );
  }, [groupedItems, selectedGroupKey]);

  const handleRegionChangeComplete = (next: Region) => {
    const prev = lastRegionRef.current;

    if (
      prev &&
      Math.abs(prev.latitude - next.latitude) < 0.0005 &&
      Math.abs(prev.longitude - next.longitude) < 0.0005 &&
      Math.abs(prev.latitudeDelta - next.latitudeDelta) < 0.0005 &&
      Math.abs(prev.longitudeDelta - next.longitudeDelta) < 0.0005
    ) {
      return;
    }

    lastRegionRef.current = next;
    onRegionChangeComplete(next);
  };

  if (locationRequired) {
    return (
      <AppScreen padded={false}>
        <View style={{ padding: 16 }}>
          <EmptyState
            title="Map needs your nearby location"
            message="Turn on location or retry so AwoJobs can place nearby jobs on the map."
            action={
              <AppButton
                title="Retry"
                onPress={onRetryLocation}
                variant="primary"
              />
            }
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <View style={{ padding: 12, gap: 12 }}>
        <SegmentedControl
          value={requestedScope}
          onChange={(value) => {
            const next = value as "local" | "national";

            if (next === "national" && (isGuest || isNationalLocked)) {
              onOpenPremium();
              return;
            }

            setRequestedScope(next);
          }}
          options={[
            { label: "Nearby", value: "local" },
            {
              label: "National",
              value: "national",
              disabled: isGuest || isNationalLocked,
            },
          ]}
        />

        <AppCard variant="muted" padding="sm">
          <AppText variant="caption" weight="700">
            {locationLabel ?? "Nearby area"}
          </AppText>
          <AppText variant="captionSm" tone="secondary">
            {loading
              ? "Loading map jobs..."
              : refreshing
                ? "Refreshing map jobs..."
                : `${items.length} job${items.length === 1 ? "" : "s"} on map`}
          </AppText>
        </AppCard>

        <CompactViewModeToggle value={viewMode} onChange={setViewMode} />
      </View>

      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={region ?? FALLBACK_REGION}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={() => {
            if (suppressNextMapPressRef.current) {
              suppressNextMapPressRef.current = false;
              return;
            }

            setSelectedId(null);
            setSelectedGroupKey(null);
          }}
          showsUserLocation
          showsMyLocationButton
          loadingEnabled
          moveOnMarkerPress={false}
        >
          {groupedItems.map((node) => {
            if (node.kind === "group") {
              return (
                <Marker
                  key={node.key}
                  coordinate={{
                    latitude: node.latitude,
                    longitude: node.longitude,
                  }}
                  onPress={() => {
                    suppressNextMapPressRef.current = true;
                    setSelectedId(null);
                    setSelectedGroupKey(node.key);
                  }}
                >
                  <AreaCountMarker count={node.items.length} />
                </Marker>
              );
            }

            const item = node.item;

            if (item.map_visibility_mode === "area_circle") {
              return (
                <React.Fragment key={item.id}>
                  <Marker
                    coordinate={{
                      latitude: item.latitude,
                      longitude: item.longitude,
                    }}
                    onPress={() => {
                      suppressNextMapPressRef.current = true;
                      setSelectedGroupKey(null);
                      setSelectedId(item.id);
                    }}
                    title={item.title}
                    description={item.display_label ?? undefined}
                    pinColor="#2563EB"
                  />
                  {item.radius_meters ? (
                    <Circle
                      center={{
                        latitude: item.latitude,
                        longitude: item.longitude,
                      }}
                      radius={item.radius_meters}
                    />
                  ) : null}
                </React.Fragment>
              );
            }

            if (
              item.map_visibility_mode === "exact_pin" ||
              item.map_visibility_mode === "offset_pin" ||
              item.map_visibility_mode === "district_anchor"
            ) {
              return (
                <Marker
                  key={item.id}
                  coordinate={{
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }}
                  onPress={() => {
                    suppressNextMapPressRef.current = true;
                    setSelectedGroupKey(null);
                    setSelectedId(item.id);
                  }}
                  title={item.title}
                  description={item.display_label ?? undefined}
                  pinColor="#2563EB"
                />
              );
            }

            return null;
          })}
        </MapView>

        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <AppButton
            title={refreshing ? "Refreshing..." : "Refresh"}
            onPress={refresh}
            variant="secondary"
          />
        </View>

        {refreshing && items.length > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 70,
              right: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.92)",
            }}
          >
            <ActivityIndicator size="small" />
            <AppText variant="captionSm">Updating map…</AppText>
          </View>
        ) : null}

        {error ? (
          <View style={{ position: "absolute", top: 12, left: 12, right: 90 }}>
            <AppCard variant="muted" padding="md">
              <AppText variant="bodySm" tone="error">
                {error}
              </AppText>
            </AppCard>
          </View>
        ) : null}

        {selectedGroup ? (
          <View
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 16,
            }}
          >
            <AppCard variant="elevated" padding="md">
              <AppText variant="labelLg" weight="700">
                {selectedGroup.items.length}{" "}
                {selectedGroup.items.length === 1 ? "job" : "jobs"} in this area
              </AppText>

              {selectedGroup.label ? (
                <AppText
                  variant="bodySm"
                  tone="secondary"
                  style={{ marginTop: 4 }}
                >
                  {selectedGroup.label}
                </AppText>
              ) : null}

              <View style={{ marginTop: 12, gap: 8 }}>
                {selectedGroup.items.map((job) => (
                  <Pressable
                    key={job.id}
                    onPress={() => {
                      setSelectedGroupKey(null);
                      navigation.navigate("JobDetail", { jobId: job.id });
                    }}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#E2E8F0",
                    }}
                  >
                    <AppText variant="bodySm" weight="700" numberOfLines={1}>
                      {job.title}
                    </AppText>

                    {job.display_label ? (
                      <AppText variant="captionSm" tone="secondary">
                        {job.display_label}
                      </AppText>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              <View style={{ marginTop: 12 }}>
                <AppButton
                  title="Close"
                  onPress={() => setSelectedGroupKey(null)}
                  variant="secondary"
                />
              </View>
            </AppCard>
          </View>
        ) : null}

        {selected ? (
          <View
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 16,
            }}
          >
            <AppCard variant="elevated" padding="md">
              <AppText variant="labelLg" weight="700">
                {selected.title}
              </AppText>

              {selected.display_label ? (
                <AppText variant="bodySm" tone="secondary">
                  {selected.display_label}
                </AppText>
              ) : null}

              <View style={{ marginTop: 12 }}>
                <AppButton
                  title="Open job"
                  onPress={() =>
                    navigation.navigate("JobDetail", { jobId: selected.id })
                  }
                  variant="primary"
                />
              </View>
            </AppCard>
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}

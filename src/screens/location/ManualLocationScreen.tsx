import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
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

type Step = "district" | "town" | "sub_county";

type LocationOption = {
  id?: string;
  district?: string;
  town?: string;
  sub_county?: string;
};

/* =====================================================
   GPS ONLY (READ-ONLY)
===================================================== */
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

export default function ManualLocationScreen({ navigation }: any) {
  const listRef = useRef<FlatList<LocationOption>>(null);

  const [step, setStep] = useState<Step>("district");
  const [district, setDistrict] = useState<string | null>(null);
  const [town, setTown] = useState<string | null>(null);

  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  /* =====================================================
     AUTO-DETECT NEAREST DISTRICT
  ====================================================== */
  useEffect(() => {
    autoDetectDistrict();
  }, []);

  async function autoDetectDistrict() {
    try {
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
    }
  }

  /* =====================================================
     LOAD OPTIONS (CACHE → RPC)
  ====================================================== */
  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      if (!mounted) return;
      setLoading(true);

      const cacheKey =
        step === "district"
          ? "districts"
          : step === "town"
            ? `towns:${district}`
            : `subcounties:${district}:${town}`;

      const cached = await getCachedList<LocationOption[]>(cacheKey);
      if (cached && mounted) {
        setOptions(cached);
        setLoading(false);
        return;
      }

      try {
        let data: LocationOption[] = [];

        if (step === "district") {
          const { data: d } = await supabase.rpc("get_districts");
          data = d ?? [];
        }

        if (step === "town" && district) {
          const { data: d } = await supabase.rpc("get_towns", {
            p_district: district,
          });
          data = d ?? [];
        }

        if (step === "sub_county" && district && town) {
          const { data: d } = await supabase.rpc("get_sub_counties", {
            p_district: district,
            p_town: town,
          });
          data = d ?? [];
        }

        if (mounted) {
          setOptions(data);
          await setCachedList(cacheKey, data);
        }
      } catch {
        if (mounted) setOptions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOptions();
    return () => {
      mounted = false;
    };
  }, [step, district, town]);

  /* =====================================================
     SEARCH FILTER
  ====================================================== */
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();

    return options.filter((o) =>
      (o.district || o.town || o.sub_county || "").toLowerCase().includes(q),
    );
  }, [query, options]);

  /* =====================================================
     A–Z INDEX (DISTRICTS ONLY)
  ====================================================== */
  const alphaIndex = useMemo(() => {
    if (step !== "district") return {};
    const map: Record<string, number> = {};

    options.forEach((o, i) => {
      const letter = o.district?.[0]?.toUpperCase();
      if (letter && map[letter] === undefined) {
        map[letter] = i;
      }
    });

    return map;
  }, [options, step]);

  /* =====================================================
     SELECT
  ====================================================== */
  async function select(item: LocationOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === "district") {
      setDistrict(item.district ?? null);
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

    await setManualLocation(item.id);

    await saveCachedLocation({
      location_id: item.id,
      district,
      town,
      sub_county: item.sub_county,
      source: "manual",
      resolved_at: Date.now(),
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.reset({
      index: 0,
      routes: [
        {
          name: "App",
          state: {
            routes: [{ name: "FeedTab" }],
          },
        },
      ],
    });
  }

  /* =====================================================
     BACK
  ====================================================== */
  function goBack() {
    if (step === "sub_county") {
      setStep("town");
      return;
    }

    if (step === "town") {
      setTown(null);
      setStep("district");
      return;
    }

    navigation.goBack();
  }

  /* =====================================================
     UI
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        <Pressable onPress={goBack} style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: "700" }}>← Back</Text>
        </Pressable>

        <Text style={{ fontSize: 20, fontWeight: "800" }}>
          Choose your location
        </Text>

        <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          {step === "district" && "Search your district"}
          {step === "town" && `District: ${district}`}
          {step === "sub_county" && `${district} • ${town}`}
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search…"
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item, i) => item.id ?? `${step}-${i}`}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => select(item)}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                {item.district || item.town || item.sub_county}
              </Text>
            </Pressable>
          )}
        />
      )}

      {step === "district" && (
        <View
          style={{
            position: "absolute",
            right: 6,
            top: 140,
            bottom: 80,
            justifyContent: "center",
          }}
        >
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
            <Pressable
              key={l}
              onPress={() => {
                const idx = alphaIndex[l];
                if (idx !== undefined) {
                  listRef.current?.scrollToIndex({
                    index: idx,
                    animated: true,
                  });
                }
              }}
              style={{ paddingVertical: 2 }}
            >
              <Text style={{ fontSize: 11, color: "#64748B" }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

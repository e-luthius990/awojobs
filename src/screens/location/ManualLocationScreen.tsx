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

import { supabase } from "../../core/supabase";
import { saveManualLocation } from "../../location/manual-location.cache";
import {
  getCachedList,
  setCachedList,
} from "../../location/location-list.cache";
import { resolveLocation } from "../../location/location.service";

type Step = "district" | "town" | "sub_county";

export default function ManualLocationScreen({ navigation }: any) {
  const listRef = useRef<FlatList>(null);

  const [step, setStep] = useState<Step>("district");
  const [district, setDistrict] = useState<string | null>(null);
  const [town, setTown] = useState<string | null>(null);

  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  /* =====================================================
     AUTO-DETECT NEAREST DISTRICT (SOFT FALLBACK)
  ====================================================== */
  useEffect(() => {
    autoDetectDistrict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoDetectDistrict() {
    try {
      const loc = await resolveLocation();
      if (!loc?.lat || !loc?.lng) return;

      const { data } = await supabase.rpc("get_nearest_district", {
        p_lat: loc.lat,
        p_lng: loc.lng,
      });

      if (data?.[0]?.district) {
        setDistrict(data[0].district);
        setStep("town");
      }
    } catch {
      // silent fallback → manual
    }
  }

  /* =====================================================
     LOAD OPTIONS (CACHE → RPC)
  ====================================================== */
  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, district, town]);

  async function loadOptions() {
    setLoading(true);

    const cacheKey =
      step === "district"
        ? "districts"
        : step === "town"
          ? `towns:${district}`
          : `subcounties:${district}:${town}`;

    // 1️⃣ CACHE FIRST (30-day TTL handled in util)
    const cached = await getCachedList<any>(cacheKey);
    if (cached) {
      setOptions(cached);
      setLoading(false);
      return;
    }

    try {
      let data: any[] = [];

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

      setOptions(data);
      await setCachedList(cacheKey, data);
    } catch (e) {
      console.error("Failed to load locations", e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     SEARCH FILTER
  ====================================================== */
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();

    return options.filter((o) =>
      (o.district || o.town || o.sub_county).toLowerCase().includes(q),
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
  async function select(item: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === "district") {
      setDistrict(item.district);
      setQuery("");
      setStep("town");
      return;
    }

    if (step === "town") {
      setTown(item.town);
      setQuery("");
      setStep("sub_county");
      return;
    }

    await saveManualLocation({
      location_id: item.id,
      district: district!,
      town: town!,
      sub_county: item.sub_county,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.reset({
      index: 0,
      routes: [{ name: "FeedTab" }],
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
      {/* HEADER */}
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

      {/* LIST */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(_, i) => String(i)}
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

      {/* A–Z INDEX */}
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

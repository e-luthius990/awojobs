import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";

export type PickerLocation = {
  id: string;
  name: string;
};

type Props = {
  label: string;
  locations: PickerLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const ITEM_HEIGHT = 60;

export default function LocationPicker({
  label,
  locations,
  selectedId,
  onSelect,
}: Props) {
  const { theme } = useTheme();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();

    if (!q) return [];

    return locations.filter((loc) => loc.name.toLowerCase().includes(q));
  }, [locations, debounced]);

  const selectedLocation = useMemo(() => {
    return locations.find((loc) => loc.id === selectedId) ?? null;
  }, [locations, selectedId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          gap: theme.spacing.sm,
        },

        label: {
          color: theme.colors.textPrimary,
        },

        selectedBox: {
          backgroundColor: theme.colors.bgSurfaceElevated,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: 4,
        },

        selectedLabel: {
          color: theme.colors.primary,
        },

        selectedValue: {
          color: theme.colors.textPrimary,
        },

        searchWrap: {
          minHeight: 48,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
          backgroundColor: theme.colors.bgSurface,
          paddingHorizontal: theme.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        },

        search: {
          flex: 1,
          color: theme.colors.textPrimary,
          fontSize: 14,
          paddingVertical: 0,
        },

        list: {
          maxHeight: 240,
        },

        option: {
          minHeight: ITEM_HEIGHT,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: theme.colors.bgSurface,
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
          gap: theme.spacing.sm,
        },

        optionActive: {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        },

        optionText: {
          flex: 1,
          color: theme.colors.textPrimary,
        },

        optionTextActive: {
          color: theme.colors.textInverse,
        },

        checkWrap: {
          width: 22,
          height: 22,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.bgSurfaceElevated,
        },

        checkWrapActive: {
          backgroundColor: "transparent",
        },

        empty: {
          paddingVertical: theme.spacing.lg,
          alignItems: "center",
        },

        emptyText: {
          color: theme.colors.textSecondary,
        },
      }),
    [theme],
  );

  const renderItem: ListRenderItem<PickerLocation> = useCallback(
    ({ item }) => {
      const active = selectedId === item.id;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.option,
            active && styles.optionActive,
            pressed ? { opacity: 0.9 } : null,
          ]}
          onPress={() => {
            onSelect(item.id);
            setSearch("");
            setDebounced("");
          }}
        >
          <AppText
            variant="bodySm"
            weight="600"
            style={[styles.optionText, active && styles.optionTextActive]}
          >
            {item.name}
          </AppText>

          <View style={[styles.checkWrap, active && styles.checkWrapActive]}>
            {active ? (
              <Ionicons
                name="checkmark"
                size={18}
                color={theme.colors.textInverse}
              />
            ) : null}
          </View>
        </Pressable>
      );
    },
    [selectedId, onSelect, styles, theme.colors.textInverse],
  );

  const keyExtractor = useCallback((item: PickerLocation) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<PickerLocation> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.wrap}>
      <AppText variant="label" weight="700" style={styles.label}>
        {label}
      </AppText>

      {selectedLocation ? (
        <View style={styles.selectedBox}>
          <AppText variant="caption" weight="700" style={styles.selectedLabel}>
            Selected location
          </AppText>
          <AppText variant="bodySm" weight="600" style={styles.selectedValue}>
            {selectedLocation.name}
          </AppText>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.textMuted}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search district, town or subcounty..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.search}
        />
      </View>

      {debounced.length === 0 ? null : filtered.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodySm" weight="600" style={styles.emptyText}>
            No matching location found
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
          scrollEnabled={false}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
          getItemLayout={getItemLayout}
        />
      )}
    </View>
  );
}

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  type ListRenderItem,
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
  placeholder?: string;
  minSearchLength?: number;
  showInitialItems?: boolean;
  maxVisibleItems?: number;
  disabled?: boolean;
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

export default function LocationPicker({
  label,
  locations,
  selectedId,
  onSelect,
  placeholder = "Search district, town or subcounty...",
  minSearchLength = 1,
  showInitialItems = false,
  maxVisibleItems = 8,
  disabled = false,
}: Props) {
  const { theme } = useTheme();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const normalizedQuery = useMemo(
    () => normalizeSearchValue(debounced),
    [debounced],
  );

  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return showInitialItems ? locations.slice(0, maxVisibleItems) : [];
    }

    if (normalizedQuery.length < minSearchLength) {
      return [];
    }

    return locations
      .filter((loc) => normalizeSearchValue(loc.name).includes(normalizedQuery))
      .slice(0, 100);
  }, [
    locations,
    normalizedQuery,
    showInitialItems,
    maxVisibleItems,
    minSearchLength,
  ]);

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
        selectedTopRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        },
        selectedLabel: {
          color: theme.colors.primary,
        },
        selectedValue: {
          color: theme.colors.textPrimary,
        },
        clearButton: {
          padding: 4,
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
          opacity: disabled ? 0.6 : 1,
        },
        search: {
          flex: 1,
          color: theme.colors.textPrimary,
          fontSize: 14,
          paddingVertical: 0,
        },
        list: {
          maxHeight: 320,
        },
        option: {
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
        helperText: {
          color: theme.colors.textSecondary,
        },
      }),
    [theme, disabled],
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
          disabled={disabled}
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
    [disabled, onSelect, selectedId, styles, theme.colors.textInverse],
  );

  const keyExtractor = useCallback((item: PickerLocation) => item.id, []);

  const shouldPromptSearch =
    !showInitialItems &&
    normalizedQuery.length > 0 &&
    normalizedQuery.length < minSearchLength;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" weight="700" style={styles.label}>
        {label}
      </AppText>

      {selectedLocation ? (
        <View style={styles.selectedBox}>
          <View style={styles.selectedTopRow}>
            <AppText
              variant="caption"
              weight="700"
              style={styles.selectedLabel}
            >
              Selected location
            </AppText>

            <Pressable
              onPress={() => onSelect("")}
              disabled={disabled}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear selected location"
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>

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
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
      </View>

      {shouldPromptSearch ? (
        <View style={styles.empty}>
          <AppText variant="bodySm" weight="600" style={styles.helperText}>
            Keep typing to search.
          </AppText>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodySm" weight="600" style={styles.emptyText}>
            {normalizedQuery
              ? "No matching location found"
              : showInitialItems
                ? "No locations available"
                : "Start typing to search"}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
          scrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
        />
      )}
    </View>
  );
}

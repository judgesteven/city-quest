import { ScrollView, Pressable, StyleSheet, Text } from "react-native";
import type { Category } from "../data/pois";
import { theme } from "../constants/theme";

type CategoryOption = Category | "all";

type CategoryFilterProps = {
  options: CategoryOption[];
  activeCategory: CategoryOption;
  onSelect: (value: CategoryOption) => void;
};

const labels: Record<CategoryOption, string> = {
  all: "All",
  food: "Food",
  history: "History",
  art: "Art",
  nature: "Nature",
  shopping: "Shopping",
  hidden: "Hidden",
};

export function CategoryFilter({
  options,
  activeCategory,
  onSelect,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => {
        const active = option === activeCategory;
        return (
          <Pressable
            key={option}
            style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  pill: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: theme.colors.categoryActive,
    borderColor: theme.colors.categoryActive,
  },
  pillInactive: {
    backgroundColor: theme.colors.categoryInactive,
    borderColor: theme.colors.surfaceBorder,
  },
  text: {
    fontSize: theme.font.sm,
    fontWeight: "600",
  },
  textActive: {
    color: theme.colors.darkText,
  },
  textInactive: {
    color: theme.colors.textSecondary,
  },
});


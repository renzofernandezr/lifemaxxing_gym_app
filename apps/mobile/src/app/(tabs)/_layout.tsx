import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import { View } from "react-native";
import { AppHeader, BottomBar, TABS } from "../../components/chrome";
import { RestBar } from "../../components/rest";
import { useLayout } from "../../components/ui";
import { useTheme } from "../../theme/theme";

export default function TabsLayout() {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  return (
    <Tabs style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <View style={{ flex: 1 }}>
        <TabSlot style={{ flex: 1 }} />
        <RestBar bottom={isDesktop ? 16 : 10} />
      </View>
      {!isDesktop ? <BottomBar /> : null}
      <TabList style={{ display: "none" }}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} />
        ))}
      </TabList>
    </Tabs>
  );
}


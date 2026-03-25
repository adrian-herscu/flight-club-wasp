import useColorMode from "../hooks/useColorMode";
import {
  DarkModeCheckboxInput,
  DarkModeKnob,
  DarkModeLabel,
  DarkModeOuterDiv,
  ModeIconDarkSlot,
  ModeIconLightSlot,
} from "./patterns/DarkModeSwitcherPatterns";

const DarkModeSwitcher = () => {
  const [colorMode, setColorMode] = useColorMode();
  const isInLightMode = colorMode === "light";

  return (
    <DarkModeOuterDiv>
      <DarkModeLabel>
        <DarkModeCheckboxInput
          onChange={() => {
            if (typeof setColorMode === "function") {
              setColorMode(isInLightMode ? "dark" : "light");
            }
          }}
        />
        <DarkModeKnob isInLightMode={isInLightMode}>
          <ModeIconLightSlot isVisible={isInLightMode} />
          <ModeIconDarkSlot isVisible={!isInLightMode} />
        </DarkModeKnob>
      </DarkModeLabel>
    </DarkModeOuterDiv>
  );
};

export default DarkModeSwitcher;

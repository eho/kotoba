import type { InputMode, SupportedLearningLanguage } from "../learning/learningTypes";

const JAPANESE_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
const CHINESE_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const KOREAN_REGEX = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;

export function detectDirection(
  text: string,
  learningLanguage: SupportedLearningLanguage = "ja"
): InputMode {
  if (learningLanguage === "zh") {
    return CHINESE_REGEX.test(text) ? "target_to_en" : "en_to_target";
  }
  if (learningLanguage === "ko") {
    return KOREAN_REGEX.test(text) ? "target_to_en" : "en_to_target";
  }
  return JAPANESE_REGEX.test(text) ? "target_to_en" : "en_to_target";
}

// Simple profanity filter for pool names and other user-generated content
// This is a basic implementation - for production, consider using a library like 'bad-words'

const profaneWords = [
  'damn', 'hell', 'crap', 'stupid', 'idiot', 'dumb',
  // Add more as needed - keeping this minimal for example
  // In production, use a comprehensive profanity filter library
];

const inappropriatePatterns = [
  /\b(fuck|shit|ass|bitch|bastard)\b/i,
  /\b(sex|porn|xxx)\b/i,
  // Add more patterns as needed
];

export const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Check against word list
  if (profaneWords.some(word => lowerText.includes(word))) {
    return true;
  }
  
  // Check against patterns
  if (inappropriatePatterns.some(pattern => pattern.test(text))) {
    return true;
  }
  
  return false;
};

export const sanitizePoolName = (name: string): { isValid: boolean; message?: string } => {
  const trimmed = name.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, message: "Pool name must be at least 3 characters long." };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, message: "Pool name must be less than 50 characters." };
  }
  
  if (containsProfanity(trimmed)) {
    return { isValid: false, message: "That name isn't allowed. Please choose a respectful, school-appropriate name." };
  }
  
  return { isValid: true };
};


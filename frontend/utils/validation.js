// Validation utilities for forms

export function validateEmail(email) {
  if (!email) return false;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

export function validatePassword(password) {
  const errors = [];

  if (!password) {
    errors.push("Lozinka je obavezna");
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push("Lozinka mora imati najmanje 8 karaktera");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Lozinka mora sadržati najmanje jedno malo slovo");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Lozinka mora sadržati najmanje jedno veliko slovo");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Lozinka mora sadržati najmanje jedan broj");
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
}

export function validateUsername(username) {
  if (!username) {
    return { isValid: false, error: "Korisničko ime je obavezno" };
  }

  if (username.length < 3) {
    return {
      isValid: false,
      error: "Korisničko ime mora imati najmanje 3 karaktera",
    };
  }

  if (username.length > 20) {
    return {
      isValid: false,
      error: "Korisničko ime može imati maksimalno 20 karaktera",
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      error: "Korisničko ime može sadržati samo slova, brojevi i _",
    };
  }

  return { isValid: true };
}

export function validateFullName(fullName) {
  if (!fullName || fullName.trim().length < 2) {
    return {
      isValid: false,
      error: "Puno ime mora imati najmanje 2 karaktera",
    };
  }

  if (fullName.trim().length > 100) {
    return {
      isValid: false,
      error: "Puno ime može imati maksimalno 100 karaktera",
    };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-ZšđčćžŠĐČĆŽ\s\-']+$/.test(fullName.trim())) {
    return {
      isValid: false,
      error: "Puno ime može sadržati samo slova, razmake, crtice i apostrofe",
    };
  }

  return { isValid: true };
}

export function validatePhone(phone) {
  if (!phone) return { isValid: true }; // Phone is optional

  // Remove all non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, "");

  // Check for valid phone number formats (Bosnia, Serbia, Croatia, etc.)
  const phoneRegex = /^(\+?387|387|0)?(6[0-9]|9[0-9])[0-9]{6,7}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: "Unesite valjan broj telefona" };
  }

  return { isValid: true };
}

export function validateDate(dateString, options = {}) {
  if (!dateString) {
    return {
      isValid: !options.required,
      error: options.required ? "Datum je obavezan" : null,
    };
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Unesite valjan datum" };
  }

  const now = new Date();

  if (options.maxDate === "today" && date > now) {
    return { isValid: false, error: "Datum ne može biti u budućnosti" };
  }

  if (options.minDate === "today" && date < now) {
    return { isValid: false, error: "Datum ne može biti u prošlosti" };
  }

  if (options.minAge && options.fieldName === "birth") {
    const age = Math.floor((now - date) / (365.25 * 24 * 60 * 60 * 1000));
    if (age > 150) {
      return { isValid: false, error: "Datum rođenja nije realан" };
    }
  }

  return { isValid: true };
}

export function validateRequired(value, fieldName = "Polje") {
  if (!value || (typeof value === "string" && value.trim().length === 0)) {
    return { isValid: false, error: `${fieldName} je obavezno` };
  }
  return { isValid: true };
}

export function validateLength(
  value,
  min = 0,
  max = Infinity,
  fieldName = "Polje"
) {
  if (!value) return { isValid: true };

  const length = value.length;

  if (length < min) {
    return {
      isValid: false,
      error: `${fieldName} mora imati najmanje ${min} karaktera`,
    };
  }

  if (length > max) {
    return {
      isValid: false,
      error: `${fieldName} može imati maksimalno ${max} karaktera`,
    };
  }

  return { isValid: true };
}

// Helper functions
function calculatePasswordStrength(password) {
  let strength = 0;

  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 25; // Special characters bonus

  if (strength > 100) strength = 100;

  if (strength < 50) return "weak";
  if (strength < 75) return "medium";
  return "strong";
}

// Form validation helper
export function validateForm(formData, validationRules) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(validationRules)) {
    const value = formData[field];

    for (const rule of rules) {
      const result = rule.validator(value, rule.options);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
        break; // Stop at first error for this field
      }
    }
  }

  return { isValid, errors };
}

// Real-time validation debouncer
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

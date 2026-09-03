import type { TranslationShape } from './en';

/** French translations (V2.3 step 47). */
export const fr: TranslationShape = {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    email: 'E-mail',
    password: 'Mot de passe',
  },
  lang: {
    label: 'Langue',
    en: 'English',
    fr: 'Français',
  },
  auth: {
    login: {
      title: 'Connexion',
      submit: 'Se connecter',
      forgot: 'Mot de passe oublié ?',
      createAccount: 'Créer un compte',
      with: 'Se connecter avec {{ provider }}',
      invalid: 'E-mail ou mot de passe invalide',
    },
    register: {
      title: 'Créer votre compte',
      firstName: 'Prénom',
      lastName: 'Nom',
      passwordHint: 'Au moins {{ count }} caractères',
      submit: 'Créer le compte',
      haveAccount: 'Déjà un compte ? Se connecter',
      failed: 'Impossible de créer le compte',
    },
    forgot: {
      title: 'Réinitialiser votre mot de passe',
      submit: 'Envoyer le lien',
      done: "Si un compte existe pour cette adresse, un lien de réinitialisation est en route. Vérifiez votre boîte de réception.",
      backToLogin: 'Retour à la connexion',
    },
    reset: {
      title: 'Choisir un nouveau mot de passe',
      newPassword: 'Nouveau mot de passe',
      passwordHint: 'Au moins {{ count }} caractères',
      missingToken: 'Ce lien de réinitialisation n’a pas de jeton. Demandez-en un nouveau.',
      requestNew: 'Demander un nouveau lien',
      submit: 'Réinitialiser le mot de passe',
      failed: 'Impossible de réinitialiser votre mot de passe. Le lien a peut-être expiré.',
    },
    verify: {
      checking: 'Vérification de votre adresse e-mail…',
      okTitle: 'E-mail vérifié',
      okBody: 'Merci — votre adresse e-mail est confirmée.',
      goToApp: 'Continuer',
      failedTitle: 'Échec de la vérification',
      failedBody: 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.',
      backToApp: "Retour à l'application",
      banner: 'Veuillez vérifier votre adresse e-mail pour sécuriser votre compte.',
      resend: "Renvoyer l'e-mail",
      resent: 'E-mail de vérification envoyé.',
    },
    twoFactor: {
      title: 'Authentification à deux facteurs',
      hint: "Saisissez le code à 6 chiffres de votre application d'authentification, ou un code de secours.",
      code: "Code d'authentification",
      verify: 'Vérifier',
      invalid: "Ce code n'est pas valide",
    },
    callback: {
      signingIn: 'Connexion en cours…',
    },
  },
  dashboard: {
    signOut: 'Se déconnecter',
    profile: 'Profil',
    appearance: 'Apparence',
    manageCookies: 'Gérer les cookies',
    signedIn: 'Connecté',
    toggleNav: 'Basculer la navigation',
    nav: {
      home: 'Accueil',
      admin: 'Administration',
      profile: 'Profil',
    },
    adminTabs: {
      users: 'Utilisateurs',
      roles: 'Rôles',
      audit: 'Journal',
    },
  },
};

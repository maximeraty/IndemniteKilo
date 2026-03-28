# Publication App Store - KiloTrack

Ce projet est une application Expo prebuild avec projets natifs `ios/` et `android/`.

## Ce qui est deja pret

- Bundle identifier iOS: `com.maximeraty.indemnitekilo`
- Team Apple: `3TB4K6758N`
- Version app: `1.0.0`
- Build number iOS: `1`
- Support iPad desactive
- Icône principale presente en 2000x2000, sans alpha
- `eas.json` ajoute pour les builds `preview` et `production`
- Privacy manifest iOS present: [`ios/KiloTrack/PrivacyInfo.xcprivacy`](/Users/maximeraty/IndemniteKilo/ios/KiloTrack/PrivacyInfo.xcprivacy)
- Paywall branche a `expo-iap` avec chargement des offres App Store et restauration d'achats

## Commandes de build et soumission

Installer les dependances Expo/EAS si necessaire:

```bash
npx eas-cli login
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Si les identifiants Apple ne sont pas encore configures dans EAS:

```bash
npx eas-cli credentials
```

## Etapes App Store Connect

1. Creer l'app dans App Store Connect avec le bundle ID `com.maximeraty.indemnitekilo`.
2. Renseigner le nom commercial, la categorie, la langue principale et le copyright.
3. Ajouter l'URL de politique de confidentialite.
4. Completer `App Privacy`.
5. Completer `App Accessibility`.
6. Ajouter les captures d'ecran iPhone requises.
7. Les captures iPad ne sont plus necessaires tant que `supportsTablet` reste a `false`.
8. Si l'app garde un abonnement/premium, creer les In-App Purchases avant soumission.

## Produits a creer dans App Store Connect

### Subscription group

- Reference name: `KiloTrack Pro`

Apple indique que les abonnements auto-renouvelables doivent etre crees dans un `Subscription Group`, puis les produits sont ajoutes a ce groupe.

### Auto-renewable subscription 1

- Reference name: `KiloTrack Pro Mensuel`
- Product ID: `kilotrack_pro_monthly`
- Duration: `1 Month`
- Display name (FR): `KiloTrack Pro Mensuel`
- Description (FR): `Trajets et exports illimites`

### Auto-renewable subscription 2

- Reference name: `KiloTrack Pro Annuel`
- Product ID: `kilotrack_pro_yearly`
- Duration: `1 Year`
- Display name (FR): `KiloTrack Pro Annuel`
- Description (FR): `Trajets et exports illimites`

### Non-consumable

- Reference name: `KiloTrack Pro a vie`
- Product ID: `kilotrack_pro_lifetime`
- Type: `Non-Consumable`
- Display name (FR): `KiloTrack Pro a vie`
- Description (FR): `Deblocage definitif des fonctions Pro`

### Pieces a fournir pour chaque produit

- au moins une localisation
- prix
- disponibilite par pays
- capture App Review de l'ecran paywall ou de l'avantage achete
- soumission a la review avec la version de l'app

## Blocages a regler avant soumission

### 1. Les produits IAP doivent exister dans App Store Connect

Le paywall est maintenant branche, mais les produits doivent etre crees et approuves dans App Store Connect avec les IDs:

- `kilotrack_pro_monthly`
- `kilotrack_pro_yearly`
- `kilotrack_pro_lifetime`

Consequence:
- tant que ces produits ne sont pas configures, les offres peuvent apparaitre comme indisponibles dans l'app.

Point technique:
- l'implementation actuelle valide localement l'achat et restaure les droits via la boutique, mais ne fait pas encore de validation serveur du recu.

### 2. Politique de confidentialite manquante

L'interface mentionne une politique de confidentialite, mais je n'ai trouve ni URL ni page publique dans le projet.

Consequence:
- App Store Connect demandera une URL de privacy policy.

### 3. App Privacy a declarer avec precision

Le projet utilise:
- stockage local (`expo-sqlite`, `AsyncStorage`)
- partage de fichiers (`expo-sharing`)
- achats integres (`expo-iap`)
- geocodage/recherche d'adresses via Apple Maps sur iOS ou Nominatim/OSRM ailleurs

Point important:
- les trajets semblent stockes localement, mais l'app contacte tout de meme des services externes pour la recherche d'adresses et le calcul d'itineraire.

## Recommandation de mise en ligne

Le chemin le plus rapide pour une premiere soumission propre:

1. Creer les 3 produits IAP dans App Store Connect.
2. Fournir une politique de confidentialite publique.
3. Completer la fiche App Store Connect.
4. Lancer le build EAS production puis un test TestFlight sur appareil reel.

## Verification locale utile

```bash
xcodebuild -version
npx expo config --type public
npx eas-cli build --platform ios --profile production
```

# 📝 Uputstvo za objavljivanje umrlica na Rahmetli.me

## Kako objaviti umrlicu - Korak po korak

### 1️⃣ Prijavljivanje na sistem

- Idite na stranicu **Rahmetli.me**
- Kliknite na dugme **"Prijavi se"** u gornjem desnom uglu
- Unesite svoje korisničko ime i lozinku
- Ako nemate nalog, kliknite na **"Registruj se"** i kreirajte nalog

---

### 2️⃣ Otvaranje forme za objavu

- Nakon što ste prijavljeni, kliknite na dugme **"Nova objava"** ili **"+"**
- Otvoriće se modal sa formom u **3 koraka**

---

## 📋 KORAK 1: Osnovna forma

### Osnovni podaci o preminuloj osobi

**Obavezna polja:**

- **Ime i prezime** - Unesite puno ime preminule osobe
- **Datum smrti** - Izaberite datum
- **Pol** - Izaberite: Muški ili Ženski

**Opcionalna polja:**

- **Datum rođenja** - Za prikaz godina života

---

### Biografija (opciono)

- Kratki opis života preminule osobe
- Informacije o karijeri, porodici, zaslugama
- Minimum 10, maksimum 2000 karaktera

---

### Hatar sesije (opciono)

Informacije o čitanju hatara/Kur'ana:

- **Datum sesije** - Kada će se čitati
- **Vrijeme početka** - Od kada
- **Vrijeme završetka** - Do kada
- **Lokacija** - Gdje će se čitati
- **Napomena** - Dodatne informacije

---

### Informacije o dženazi i pogrebu

**Dženaza:**

- **Datum dženaze**
- **Vrijeme dženaze** (npr. 13:00)
- **Lokacija dženaze** (džamija ili druga lokacija)

**Pogreb:**

- **Groblje** - Izaberite iz liste groblja
- **Datum pogreba**
- **Vrijeme pogreba**

---

### Ožalošćeni (Porodica)

Lista članova porodice koji žale:

**Predefinisane relacije:**

- Supruga/Suprug
- Sin/Kćerka
- Otac/Majka
- Brat/Sestra
- Ostalo

**Kako dodati:**

1. Izaberite tip relacije (npr. "Sin")
2. Unesite ime (npr. "Emir")
3. Kliknite **"+ Dodaj člana porodice"** za još članova
4. Za brisanje člana kliknite **X** pored imena

---

### Kategorija objave

Izaberite tip objave:

- **Dženaza** - Najava dženaze i pogreba
- **In Memoriam** - Sećanje na preminulu osobu
- **Godišnjica** - Godišnjica smrti
- **Ostalo**

---

### Dodavanje slika

1. Kliknite na dugme **"+ Dodaj slike"**
2. Izaberite jednu ili više slika sa računara
3. Podržani formati: **JPEG, PNG, WebP**
4. Maksimalna veličina: **5MB po slici**
5. Slike će biti automatski optimizovane (800x800px, 85% kvalitet)
6. Za brisanje slike kliknite na **X** u uglu slike

---

### Dodatne informacije (opciono)

Prostor za unos dodatnog sadržaja:

- Ayeti iz Kur'ana
- Dove
- Posebne poruke
- Citati

---

### Akcije na formi

- **Otkaži** - Zatvara formu bez čuvanja
- **Generiši preview** - Prelazi na korak 2 (pregled)

---

## 👁️ KORAK 2: Preview (Pregled)

Na ovom koraku vidite **kako će umrlica izgledati** na sajtu.

### Elementi pregleda:

```
┌─────────────────────────────────────┐
│  ☪ [Simbol polumjeseca i zvijezde]  │
├─────────────────────────────────────┤
│ RAHMETULLAHI ALEJHI RAHMETEN VASIAH │
├─────────────────────────────────────┤
│                                     │
│  [Slika preminule osobe - ako postoji]
│                                     │
│  Ime i prezime                      │
│  Datum rođenja - Datum smrti        │
│  (Broj godina)                      │
│                                     │
│  Biografija...                      │
│                                     │
│  Informacije o dženazi              │
│  📅 Datum, ⏰ Vrijeme, 📍 Lokacija   │
│                                     │
│  Informacije o pogrebu              │
│  ⚰️ Groblje, Datum, Vrijeme          │
│                                     │
│  Ožalošćeni:                        │
│  Supruga: Ime                       │
│  Sinovi: Ime1, Ime2                 │
│  Kćerke: Ime1                       │
│  ...                                │
│                                     │
│  [Dodatni sadržaj ako je unesen]   │
└─────────────────────────────────────┘
```

### Akcije na pregledu:

- **Nazad na formu** - Vrati se na korak 1 za izmjene
- **Edituj HTML** - Prelazi na korak 3 za napredne izmjene
- **Objavi ovako** - Direktno objavljuje umrlicu

---

## ✏️ KORAK 3: Edituj HTML (Napredni korisnici)

Ovaj korak omogućava **direktno uređivanje sadržaja** pomoću vizuelnog editora (Quill.js).

### Quill Editor mogućnosti:

- **Formatiranje teksta**: Bold, Italic, Underline, Strikethrough
- **Naslovi**: H1, H2, H3, H4, H5, H6
- **Liste**: Numerisane, Bullet liste
- **Indentacija**: Povećaj/Smanji uvlačenje
- **Boje**: Boja teksta i pozadine
- **Linkovi**: Dodavanje hiperlinkova
- **Slike**: Ubacivanje slika
- **Video**: Embed video sadržaja
- **Blokovi**: Quote, Code block

### Predefinisani šabloni:

Kliknite na dugme da ubacite gotov šablon:

**📅 Informacije o sahrani**

```
<h3>Informacije o sahrani</h3>
<p><strong>Dženaza:</strong> [Datum i vrijeme]</p>
<p><strong>Pogreb:</strong> [Lokacija]</p>
```

**👨‍👩‍👧‍👦 Porodica**

```
<h3>Ožalošćeni</h3>
<ul>
  <li>Supruga: [Ime]</li>
  <li>Sinovi: [Imena]</li>
  <li>Kćerke: [Imena]</li>
</ul>
```

**🤲 Dova**

```
<div style="text-align: center; font-style: italic; padding: 20px; background: #f9fafb; border-left: 4px solid #006233;">
  <p>"Allahume-gfir lehu verhamhu ve 'afihi ve'fu anhu"</p>
  <p style="font-size: 0.9em;">Allahu dž.š. neka mu oprosti, neka mu se smiluje, neka ga zaštiti i neka mu dadne oprosta</p>
</div>
```

### Live preview

- Desna strana pokazuje **uživo pregled** kako će izgledati
- Svaka izmjena se odmah vidi

### Akcije u edit modu:

- **Nazad na preview** - Vrati se na korak 2
- **Sačuvaj i objavi** - Potvrdi izmjene i objavi

---

## ✅ Finalni korak: Objavljivanje

Kada kliknete **"Objavi ovako"** ili **"Sačuvaj i objavi"**:

1. **Validacija podataka** - Sistem provjerava da li su svi obavezni podaci unijeti
2. **Upload slika** - Slike se procesiraju i optimizuju
3. **Kreiranje objave** - Objava se šalje na server
4. **Status objave** - Objava ide na **odobrenje administratora**
5. **Notifikacija** - Prikazuje se poruka o uspjehu

### Poruka nakon objave:

```
✅ Objava je uspješno poslata!

Vaša objava je predata i čeka se odobrenje administratora.
Bićete obaviješteni kada objava bude objavljena.
```

---

## ⚠️ Važne napomene

### Obavezna polja:

- ✅ Ime i prezime
- ✅ Datum smrti
- ✅ Pol
- ✅ Kategorija

### Preporuke:

- 📸 **Dodajte sliku** - Objave sa slikama privlače više pažnje
- 📝 **Biografija** - Kratki opis čini objavu ličnijom
- 👥 **Ožalošćeni** - Lista porodice pokazuje ko žali
- 📅 **Informacije o dženazi** - Pomažu ljudima da prisustvuju

### Ograničenja:

- **Slike**: Max 5MB, formati JPG/PNG/WebP
- **Biografija**: 10-2000 karaktera
- **Ime**: Samo slova, razmaci i bosanski karakteri (ć, č, š, đ, ž)

---

## 🔄 Tok objavljivanja (Dijagram)

```
Prijava → Nova objava → Forma (Korak 1)
                            ↓
                    Generiši preview
                            ↓
                    Preview (Korak 2) ←──────┐
                      ↙      ↓       ↘       │
              Nazad  Objavi  Edituj          │
                ↓      ↓       ↓             │
            Forma    Admin   Edit (Korak 3)  │
                   odobrenje      ↓          │
                       ↓      Sačuvaj ───────┘
                   Objavljeno
```

---

## 📞 Podrška

Ako imate problema:

- Kontaktirajte **administratora** putem email-a
- Provjerite da li ste **prijavljeni**
- Provjerite da li su **obavezna polja** popunjena
- Osigurajte da **slike nisu prevelike**

---

## 💡 Savjeti za kvalitetnu objavu

1. **Koristite kvalitetne slike** - Jasne, profesionalne fotografije
2. **Budite precizan** - Tačni datumi i vremena
3. **Provjerite podatke** - Pre objave pregledajte sve informacije
4. **Koristite biografiju** - Kratka priča o životu preminule osobe
5. **Dodajte dove** - Islamske dove i ayeti čine objavu ličnijom

---

**Rahmetullahi alejhi rahmeten vasiah** 🤲

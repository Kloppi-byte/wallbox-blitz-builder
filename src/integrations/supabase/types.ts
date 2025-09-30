export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      article_master: {
        Row: {
          artikel_einheit: string | null
          artikel_name: string | null
          artikel_preis: number | null
          artikelnummer: string
          created_at: string | null
          einkaufspreis: number | null
          kategorie: string | null
          mwst: number | null
          subkategorie: string | null
        }
        Insert: {
          artikel_einheit?: string | null
          artikel_name?: string | null
          artikel_preis?: number | null
          artikelnummer: string
          created_at?: string | null
          einkaufspreis?: number | null
          kategorie?: string | null
          mwst?: number | null
          subkategorie?: string | null
        }
        Update: {
          artikel_einheit?: string | null
          artikel_name?: string | null
          artikel_preis?: number | null
          artikelnummer?: string
          created_at?: string | null
          einkaufspreis?: number | null
          kategorie?: string | null
          mwst?: number | null
          subkategorie?: string | null
        }
        Relationships: []
      }
      BotKontakt: {
        Row: {
          id: number
          telefonnummer: string
        }
        Insert: {
          id?: number
          telefonnummer: string
        }
        Update: {
          id?: number
          telefonnummer?: string
        }
        Relationships: []
      }
      call_assistent: {
        Row: {
          content: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      company_products: {
        Row: {
          company_id: number
          created_at: string
          id: string
          product_id: number
        }
        Insert: {
          company_id: number
          created_at?: string
          id?: string
          product_id: number
        }
        Update: {
          company_id?: number
          created_at?: string
          id?: string
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "locs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_products_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "locs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_products_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_nutzer: {
        Row: {
          created_at: string
          id: string
          nutzer_typ: string
          partner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nutzer_typ: string
          partner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nutzer_typ?: string
          partner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_nutzer_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerbetriebe"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      "Hilti Werkzeugübersicht": {
        Row: {
          Abrechnungshäufigkeit: string | null
          "Anfallende Gebühren": string | null
          "Anzahl der Reparaturen": string | null
          Artikelnummer: string
          Auftragsnummer: string | null
          Beschreibung: string | null
          Bestellzeichen: string | null
          Diebstahlabsicherung: string | null
          Equipmentnummer: string | null
          Garantiezeitraum: string | null
          "Geräte Status": string | null
          "Geräte-Generation": string | null
          "Geräte-Typ": string | null
          Inventarnummer: string | null
          Kaufdatum: string | null
          "Laufzeit Monate": number | null
          "Leihgerät möglich": string | null
          "letzte Reparatur": string | null
          "Monatliche Gebühr": string | null
          "Organisatorische Referenz": string | null
          Reparaturkosten: string | null
          Serialnummer: string | null
          Startdatum: string | null
          Vertragsart: string | null
          Vertragsbeginn: string | null
          Vertragsdauer: number | null
          Vertragsende: string | null
          "Voraussichtliches Enddatum": string | null
        }
        Insert: {
          Abrechnungshäufigkeit?: string | null
          "Anfallende Gebühren"?: string | null
          "Anzahl der Reparaturen"?: string | null
          Artikelnummer: string
          Auftragsnummer?: string | null
          Beschreibung?: string | null
          Bestellzeichen?: string | null
          Diebstahlabsicherung?: string | null
          Equipmentnummer?: string | null
          Garantiezeitraum?: string | null
          "Geräte Status"?: string | null
          "Geräte-Generation"?: string | null
          "Geräte-Typ"?: string | null
          Inventarnummer?: string | null
          Kaufdatum?: string | null
          "Laufzeit Monate"?: number | null
          "Leihgerät möglich"?: string | null
          "letzte Reparatur"?: string | null
          "Monatliche Gebühr"?: string | null
          "Organisatorische Referenz"?: string | null
          Reparaturkosten?: string | null
          Serialnummer?: string | null
          Startdatum?: string | null
          Vertragsart?: string | null
          Vertragsbeginn?: string | null
          Vertragsdauer?: number | null
          Vertragsende?: string | null
          "Voraussichtliches Enddatum"?: string | null
        }
        Update: {
          Abrechnungshäufigkeit?: string | null
          "Anfallende Gebühren"?: string | null
          "Anzahl der Reparaturen"?: string | null
          Artikelnummer?: string
          Auftragsnummer?: string | null
          Beschreibung?: string | null
          Bestellzeichen?: string | null
          Diebstahlabsicherung?: string | null
          Equipmentnummer?: string | null
          Garantiezeitraum?: string | null
          "Geräte Status"?: string | null
          "Geräte-Generation"?: string | null
          "Geräte-Typ"?: string | null
          Inventarnummer?: string | null
          Kaufdatum?: string | null
          "Laufzeit Monate"?: number | null
          "Leihgerät möglich"?: string | null
          "letzte Reparatur"?: string | null
          "Monatliche Gebühr"?: string | null
          "Organisatorische Referenz"?: string | null
          Reparaturkosten?: string | null
          Serialnummer?: string | null
          Startdatum?: string | null
          Vertragsart?: string | null
          Vertragsbeginn?: string | null
          Vertragsdauer?: number | null
          Vertragsende?: string | null
          "Voraussichtliches Enddatum"?: string | null
        }
        Relationships: []
      }
      locs: {
        Row: {
          address: string | null
          color: string | null
          created_at: string
          id: number
          mail: string | null
          name: string | null
          telefonnummer: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          color?: string | null
          created_at?: string
          id?: number
          mail?: string | null
          name?: string | null
          telefonnummer?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          color?: string | null
          created_at?: string
          id?: number
          mail?: string | null
          name?: string | null
          telefonnummer?: string | null
          website?: string | null
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      offers_package_items: {
        Row: {
          created_at: string | null
          id: number
          package_id: number
          produkt_gruppe_id: string
          quantity_base: number | null
          quantity_per_floor: number | null
          quantity_per_room: number | null
          quantity_per_sqm: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          package_id: number
          produkt_gruppe_id: string
          quantity_base?: number | null
          quantity_per_floor?: number | null
          quantity_per_room?: number | null
          quantity_per_sqm?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          package_id?: number
          produkt_gruppe_id?: string
          quantity_base?: number | null
          quantity_per_floor?: number | null
          quantity_per_room?: number | null
          quantity_per_sqm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "offers_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_package_items_produkt_gruppe_id_fkey"
            columns: ["produkt_gruppe_id"]
            isOneToOne: false
            referencedRelation: "offers_product_groups"
            referencedColumns: ["group_id"]
          },
        ]
      }
      offers_package_parameter_definitions: {
        Row: {
          default_value: string | null
          label: string
          param_key: string
          param_type: string
          unit: string | null
        }
        Insert: {
          default_value?: string | null
          label: string
          param_key: string
          param_type: string
          unit?: string | null
        }
        Update: {
          default_value?: string | null
          label?: string
          param_key?: string
          param_type?: string
          unit?: string | null
        }
        Relationships: []
      }
      offers_package_parameter_links: {
        Row: {
          package_id: number
          param_key: string
        }
        Insert: {
          package_id: number
          param_key: string
        }
        Update: {
          package_id?: number
          param_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_package_parameter_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "offers_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_package_parameter_links_param_key_fkey"
            columns: ["param_key"]
            isOneToOne: false
            referencedRelation: "offers_package_parameter_definitions"
            referencedColumns: ["param_key"]
          },
        ]
      }
      offers_packages: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: number
          is_optional: boolean | null
          name: string
          quality_level: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          is_optional?: boolean | null
          name: string
          quality_level?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          is_optional?: boolean | null
          name?: string
          quality_level?: string | null
        }
        Relationships: []
      }
      offers_product_groups: {
        Row: {
          description: string | null
          group_id: string
        }
        Insert: {
          description?: string | null
          group_id: string
        }
        Update: {
          description?: string | null
          group_id?: string
        }
        Relationships: []
      }
      offers_products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          image: string | null
          name: string
          product_id: string
          produkt_gruppe: string | null
          qualitaetsstufe: string | null
          stunden_geselle: number | null
          stunden_meister: number | null
          stunden_monteur: number | null
          unit: string
          unit_price: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          image?: string | null
          name: string
          product_id: string
          produkt_gruppe?: string | null
          qualitaetsstufe?: string | null
          stunden_geselle?: number | null
          stunden_meister?: number | null
          stunden_monteur?: number | null
          unit: string
          unit_price: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          image?: string | null
          name?: string
          product_id?: string
          produkt_gruppe?: string | null
          qualitaetsstufe?: string | null
          stunden_geselle?: number | null
          stunden_meister?: number | null
          stunden_monteur?: number | null
          unit?: string
          unit_price?: number
        }
        Relationships: []
      }
      onboarding_locs: {
        Row: {
          besprechungstermin: string | null
          created_at: string
          "Erster Login": string | null
          "Erstes Passwort": string | null
          last_updated_on: string | null
          onboarding_partner_name: string | null
          partner_id: string
          partner_type: string | null
          status: string
          uid: string
        }
        Insert: {
          besprechungstermin?: string | null
          created_at?: string
          "Erster Login"?: string | null
          "Erstes Passwort"?: string | null
          last_updated_on?: string | null
          onboarding_partner_name?: string | null
          partner_id: string
          partner_type?: string | null
          status?: string
          uid?: string
        }
        Update: {
          besprechungstermin?: string | null
          created_at?: string
          "Erster Login"?: string | null
          "Erstes Passwort"?: string | null
          last_updated_on?: string | null
          onboarding_partner_name?: string | null
          partner_id?: string
          partner_type?: string | null
          status?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_partner"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerbetriebe"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_registrations: {
        Row: {
          company: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      partnerbetriebe: {
        Row: {
          adresse: string | null
          "Anfragen@ Account": string | null
          "API Key Hero Account": string | null
          api_keys_getmika: string | null
          betriebsnummer: string | null
          contact_person: string | null
          email_address_contact: string | null
          email_belegemanagement: string | null
          email_getmika: string | null
          "Gewerbeanmeldung Link": string | null
          Gewerk: string | null
          "Handwerkskarte Link": string | null
          hrb_nr: string | null
          iban: string | null
          id: string
          Leistungsbeschreibung: string | null
          logo_link: string | null
          partner_id: string | null
          partnerbetrieb: string | null
          "Personalausweis Link": string | null
          phone_number: string | null
          plz: string[] | null
          "Private Mail LOC Gründer": string | null
          rechtsform: string | null
          "SMTP Key Google <> Offpaper": string | null
          steuernummer: string | null
          ust_id: string | null
          Website: string | null
        }
        Insert: {
          adresse?: string | null
          "Anfragen@ Account"?: string | null
          "API Key Hero Account"?: string | null
          api_keys_getmika?: string | null
          betriebsnummer?: string | null
          contact_person?: string | null
          email_address_contact?: string | null
          email_belegemanagement?: string | null
          email_getmika?: string | null
          "Gewerbeanmeldung Link"?: string | null
          Gewerk?: string | null
          "Handwerkskarte Link"?: string | null
          hrb_nr?: string | null
          iban?: string | null
          id?: string
          Leistungsbeschreibung?: string | null
          logo_link?: string | null
          partner_id?: string | null
          partnerbetrieb?: string | null
          "Personalausweis Link"?: string | null
          phone_number?: string | null
          plz?: string[] | null
          "Private Mail LOC Gründer"?: string | null
          rechtsform?: string | null
          "SMTP Key Google <> Offpaper"?: string | null
          steuernummer?: string | null
          ust_id?: string | null
          Website?: string | null
        }
        Update: {
          adresse?: string | null
          "Anfragen@ Account"?: string | null
          "API Key Hero Account"?: string | null
          api_keys_getmika?: string | null
          betriebsnummer?: string | null
          contact_person?: string | null
          email_address_contact?: string | null
          email_belegemanagement?: string | null
          email_getmika?: string | null
          "Gewerbeanmeldung Link"?: string | null
          Gewerk?: string | null
          "Handwerkskarte Link"?: string | null
          hrb_nr?: string | null
          iban?: string | null
          id?: string
          Leistungsbeschreibung?: string | null
          logo_link?: string | null
          partner_id?: string | null
          partnerbetrieb?: string | null
          "Personalausweis Link"?: string | null
          phone_number?: string | null
          plz?: string[] | null
          "Private Mail LOC Gründer"?: string | null
          rechtsform?: string | null
          "SMTP Key Google <> Offpaper"?: string | null
          steuernummer?: string | null
          ust_id?: string | null
          Website?: string | null
        }
        Relationships: []
      }
      produkte: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      "Qonto Database": {
        Row: {
          "Abrechnungsdatum (UTC)": string | null
          "Abrechnungstag (lokal)": string | null
          Anhang: string | null
          "Anhang erforderlich": boolean | null
          "Anhang verloren gegangen": boolean | null
          Bank: string | null
          "Betrag (ohne 0.0% MwSt.)": string | null
          "Betrag (ohne 0.8% MwSt.)": string | null
          "Betrag (ohne 10.0% MwSt.)": string | null
          "Betrag (ohne 11.3% MwSt.)": string | null
          "Betrag (ohne 15.2% MwSt.)": string | null
          "Betrag (ohne 17.9% MwSt.)": string | null
          "Betrag (ohne 19.0% MwSt.)": string | null
          "Betrag (ohne 20.0% MwSt.)": string | null
          "Betrag (ohne 3.0% MwSt.)": string | null
          "Betrag (ohne 7.0% MwSt.)": string | null
          "Betrag (ohne 8.1% MwSt.)": string | null
          "Cashflow-Kategorie": string | null
          "Cashflow-Unterkategorie": string | null
          "Datum des Vorgangs (lokal)": string | null
          "Datum des Vorgangs (UTC)": string | null
          "E-Mail-Adresse des Initiators": string | null
          "Gesamtbetrag (inkl. MwSt.)": string | null
          "Gesamtbetrag (inkl. MwSt.) (lokal)": string | null
          "Gesamtbetrag (ohne MwSt.)": string | null
          Haben: string | null
          "HR Costs": string | null
          "IBAN der Gegenpartei": string | null
          Kartenname: string | null
          Kategorie: string | null
          "Konto ID": string | null
          "Konto-IBAN": string | null
          Kontoname: string | null
          Kontostand: string | null
          "Marketing Channel": string | null
          "Marketing Purpose": string | null
          "MwSt.-Betrag (0.0%)": string | null
          "MwSt.-Betrag (0.8%)": string | null
          "MwSt.-Betrag (10.0%)": string | null
          "MwSt.-Betrag (11.3%)": string | null
          "MwSt.-Betrag (15.2%)": string | null
          "MwSt.-Betrag (17.9%)": string | null
          "MwSt.-Betrag (19.0%)": string | null
          "MwSt.-Betrag (20.0%)": string | null
          "MwSt.-Betrag (3.0%)": string | null
          "MwSt.-Betrag (7.0%)": string | null
          "MwSt.-Betrag (8.1%)": string | null
          "MwSt.-Betrag insgesamt": string | null
          "Name der Gegenpartei": string | null
          Notiz: string | null
          Operations: string | null
          Other: string | null
          Overhead: string | null
          "Overhead Costs": string | null
          Partner: string | null
          Referenz: string | null
          Soll: string | null
          Status: string | null
          Subkategorie: string | null
          SubSubKategorie: string | null
          Team: string | null
          "Transaction type": string | null
          "Transaktions-ID": string
          "Veranlasst von": string | null
          Währung: string | null
          "Währung (lokal)": string | null
          Zahlungsart: string | null
        }
        Insert: {
          "Abrechnungsdatum (UTC)"?: string | null
          "Abrechnungstag (lokal)"?: string | null
          Anhang?: string | null
          "Anhang erforderlich"?: boolean | null
          "Anhang verloren gegangen"?: boolean | null
          Bank?: string | null
          "Betrag (ohne 0.0% MwSt.)"?: string | null
          "Betrag (ohne 0.8% MwSt.)"?: string | null
          "Betrag (ohne 10.0% MwSt.)"?: string | null
          "Betrag (ohne 11.3% MwSt.)"?: string | null
          "Betrag (ohne 15.2% MwSt.)"?: string | null
          "Betrag (ohne 17.9% MwSt.)"?: string | null
          "Betrag (ohne 19.0% MwSt.)"?: string | null
          "Betrag (ohne 20.0% MwSt.)"?: string | null
          "Betrag (ohne 3.0% MwSt.)"?: string | null
          "Betrag (ohne 7.0% MwSt.)"?: string | null
          "Betrag (ohne 8.1% MwSt.)"?: string | null
          "Cashflow-Kategorie"?: string | null
          "Cashflow-Unterkategorie"?: string | null
          "Datum des Vorgangs (lokal)"?: string | null
          "Datum des Vorgangs (UTC)"?: string | null
          "E-Mail-Adresse des Initiators"?: string | null
          "Gesamtbetrag (inkl. MwSt.)"?: string | null
          "Gesamtbetrag (inkl. MwSt.) (lokal)"?: string | null
          "Gesamtbetrag (ohne MwSt.)"?: string | null
          Haben?: string | null
          "HR Costs"?: string | null
          "IBAN der Gegenpartei"?: string | null
          Kartenname?: string | null
          Kategorie?: string | null
          "Konto ID"?: string | null
          "Konto-IBAN"?: string | null
          Kontoname?: string | null
          Kontostand?: string | null
          "Marketing Channel"?: string | null
          "Marketing Purpose"?: string | null
          "MwSt.-Betrag (0.0%)"?: string | null
          "MwSt.-Betrag (0.8%)"?: string | null
          "MwSt.-Betrag (10.0%)"?: string | null
          "MwSt.-Betrag (11.3%)"?: string | null
          "MwSt.-Betrag (15.2%)"?: string | null
          "MwSt.-Betrag (17.9%)"?: string | null
          "MwSt.-Betrag (19.0%)"?: string | null
          "MwSt.-Betrag (20.0%)"?: string | null
          "MwSt.-Betrag (3.0%)"?: string | null
          "MwSt.-Betrag (7.0%)"?: string | null
          "MwSt.-Betrag (8.1%)"?: string | null
          "MwSt.-Betrag insgesamt"?: string | null
          "Name der Gegenpartei"?: string | null
          Notiz?: string | null
          Operations?: string | null
          Other?: string | null
          Overhead?: string | null
          "Overhead Costs"?: string | null
          Partner?: string | null
          Referenz?: string | null
          Soll?: string | null
          Status?: string | null
          Subkategorie?: string | null
          SubSubKategorie?: string | null
          Team?: string | null
          "Transaction type"?: string | null
          "Transaktions-ID": string
          "Veranlasst von"?: string | null
          Währung?: string | null
          "Währung (lokal)"?: string | null
          Zahlungsart?: string | null
        }
        Update: {
          "Abrechnungsdatum (UTC)"?: string | null
          "Abrechnungstag (lokal)"?: string | null
          Anhang?: string | null
          "Anhang erforderlich"?: boolean | null
          "Anhang verloren gegangen"?: boolean | null
          Bank?: string | null
          "Betrag (ohne 0.0% MwSt.)"?: string | null
          "Betrag (ohne 0.8% MwSt.)"?: string | null
          "Betrag (ohne 10.0% MwSt.)"?: string | null
          "Betrag (ohne 11.3% MwSt.)"?: string | null
          "Betrag (ohne 15.2% MwSt.)"?: string | null
          "Betrag (ohne 17.9% MwSt.)"?: string | null
          "Betrag (ohne 19.0% MwSt.)"?: string | null
          "Betrag (ohne 20.0% MwSt.)"?: string | null
          "Betrag (ohne 3.0% MwSt.)"?: string | null
          "Betrag (ohne 7.0% MwSt.)"?: string | null
          "Betrag (ohne 8.1% MwSt.)"?: string | null
          "Cashflow-Kategorie"?: string | null
          "Cashflow-Unterkategorie"?: string | null
          "Datum des Vorgangs (lokal)"?: string | null
          "Datum des Vorgangs (UTC)"?: string | null
          "E-Mail-Adresse des Initiators"?: string | null
          "Gesamtbetrag (inkl. MwSt.)"?: string | null
          "Gesamtbetrag (inkl. MwSt.) (lokal)"?: string | null
          "Gesamtbetrag (ohne MwSt.)"?: string | null
          Haben?: string | null
          "HR Costs"?: string | null
          "IBAN der Gegenpartei"?: string | null
          Kartenname?: string | null
          Kategorie?: string | null
          "Konto ID"?: string | null
          "Konto-IBAN"?: string | null
          Kontoname?: string | null
          Kontostand?: string | null
          "Marketing Channel"?: string | null
          "Marketing Purpose"?: string | null
          "MwSt.-Betrag (0.0%)"?: string | null
          "MwSt.-Betrag (0.8%)"?: string | null
          "MwSt.-Betrag (10.0%)"?: string | null
          "MwSt.-Betrag (11.3%)"?: string | null
          "MwSt.-Betrag (15.2%)"?: string | null
          "MwSt.-Betrag (17.9%)"?: string | null
          "MwSt.-Betrag (19.0%)"?: string | null
          "MwSt.-Betrag (20.0%)"?: string | null
          "MwSt.-Betrag (3.0%)"?: string | null
          "MwSt.-Betrag (7.0%)"?: string | null
          "MwSt.-Betrag (8.1%)"?: string | null
          "MwSt.-Betrag insgesamt"?: string | null
          "Name der Gegenpartei"?: string | null
          Notiz?: string | null
          Operations?: string | null
          Other?: string | null
          Overhead?: string | null
          "Overhead Costs"?: string | null
          Partner?: string | null
          Referenz?: string | null
          Soll?: string | null
          Status?: string | null
          Subkategorie?: string | null
          SubSubKategorie?: string | null
          Team?: string | null
          "Transaction type"?: string | null
          "Transaktions-ID"?: string
          "Veranlasst von"?: string | null
          Währung?: string | null
          "Währung (lokal)"?: string | null
          Zahlungsart?: string | null
        }
        Relationships: []
      }
      strauss_bestellungen: {
        Row: {
          auftragsnummer_strauss: string | null
          bearbeitungsnummer_strauss: string | null
          bestelldetails: Json | null
          bestellstatus: string | null
          id: number
          partner_id: string
          updated_on: string | null
        }
        Insert: {
          auftragsnummer_strauss?: string | null
          bearbeitungsnummer_strauss?: string | null
          bestelldetails?: Json | null
          bestellstatus?: string | null
          id?: number
          partner_id: string
          updated_on?: string | null
        }
        Update: {
          auftragsnummer_strauss?: string | null
          bearbeitungsnummer_strauss?: string | null
          bestelldetails?: Json | null
          bestellstatus?: string | null
          id?: number
          partner_id?: string
          updated_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_strauss_partner"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerbetriebe"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      task_status: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          partner_id: string
          status: string
          subpage: string
          task_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          partner_id: string
          status?: string
          subpage: string
          task_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string
          status?: string
          subpage?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_articles: {
        Row: {
          artikelnummer: string | null
          created_at: string | null
          kategorie: string | null
          menge: number | null
          vorlage_name: string | null
        }
        Insert: {
          artikelnummer?: string | null
          created_at?: string | null
          kategorie?: string | null
          menge?: number | null
          vorlage_name?: string | null
        }
        Update: {
          artikelnummer?: string | null
          created_at?: string | null
          kategorie?: string | null
          menge?: number | null
          vorlage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_articles_artikelnummer_fkey"
            columns: ["artikelnummer"]
            isOneToOne: false
            referencedRelation: "article_master"
            referencedColumns: ["artikelnummer"]
          },
        ]
      }
      use_cases: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      wallbox_leads: {
        Row: {
          adresse: string
          created_at: string
          email: string
          features: Json | null
          foerderung: boolean
          id: string
          installation: string
          name: string
          plz: string
          updated_at: string
          wallbox_typ: string
        }
        Insert: {
          adresse: string
          created_at?: string
          email: string
          features?: Json | null
          foerderung?: boolean
          id?: string
          installation: string
          name: string
          plz: string
          updated_at?: string
          wallbox_typ: string
        }
        Update: {
          adresse?: string
          created_at?: string
          email?: string
          features?: Json | null
          foerderung?: boolean
          id?: string
          installation?: string
          name?: string
          plz?: string
          updated_at?: string
          wallbox_typ?: string
        }
        Relationships: []
      }
      wallboxen: {
        Row: {
          "Anzahl Einheit": string | null
          Artikelnummer: number
          auto_select: string[] | null
          Beschreibung: string | null
          Einheit: string | null
          exclude: string[] | null
          "Faktor Baujahr < 1990": number | null
          "Faktor Etage": number | null
          "Faktor Unterputz==true": number | null
          "Faktor Wohnfläche": number | null
          "Faktor Zimmer": number | null
          foto: string | null
          Kategorie: string | null
          Name: string | null
          optional: string[] | null
          preselect: boolean | null
          required: string[] | null
          stunden_geselle: string | null
          stunden_meister: string | null
          stunden_monteur: string | null
          Überkategorie: string | null
          Überüberkategorie: string[] | null
          Verkaufspreis: string | null
        }
        Insert: {
          "Anzahl Einheit"?: string | null
          Artikelnummer?: number
          auto_select?: string[] | null
          Beschreibung?: string | null
          Einheit?: string | null
          exclude?: string[] | null
          "Faktor Baujahr < 1990"?: number | null
          "Faktor Etage"?: number | null
          "Faktor Unterputz==true"?: number | null
          "Faktor Wohnfläche"?: number | null
          "Faktor Zimmer"?: number | null
          foto?: string | null
          Kategorie?: string | null
          Name?: string | null
          optional?: string[] | null
          preselect?: boolean | null
          required?: string[] | null
          stunden_geselle?: string | null
          stunden_meister?: string | null
          stunden_monteur?: string | null
          Überkategorie?: string | null
          Überüberkategorie?: string[] | null
          Verkaufspreis?: string | null
        }
        Update: {
          "Anzahl Einheit"?: string | null
          Artikelnummer?: number
          auto_select?: string[] | null
          Beschreibung?: string | null
          Einheit?: string | null
          exclude?: string[] | null
          "Faktor Baujahr < 1990"?: number | null
          "Faktor Etage"?: number | null
          "Faktor Unterputz==true"?: number | null
          "Faktor Wohnfläche"?: number | null
          "Faktor Zimmer"?: number | null
          foto?: string | null
          Kategorie?: string | null
          Name?: string | null
          optional?: string[] | null
          preselect?: boolean | null
          required?: string[] | null
          stunden_geselle?: string | null
          stunden_meister?: string | null
          stunden_monteur?: string | null
          Überkategorie?: string | null
          Überüberkategorie?: string[] | null
          Verkaufspreis?: string | null
        }
        Relationships: []
      }
      Werkzeugbestellungen: {
        Row: {
          Angebotsnummer_Anbieter: string | null
          Artikelbezeichnung: string | null
          Artikelnummer: string | null
          "bestelldetails Provider": Json | null
          Bestellstatus: string | null
          id: number
          Lieferadresse: string | null
          "Mitarbeiter für Geräte": string | null
          "Monatliche Gesamtrate (€)": string | null
          Nutzungsdauer: string | null
          "Partner Name/Organisatorische Referenz": string | null
          partner_id: string
          updated_on: string | null
        }
        Insert: {
          Angebotsnummer_Anbieter?: string | null
          Artikelbezeichnung?: string | null
          Artikelnummer?: string | null
          "bestelldetails Provider"?: Json | null
          Bestellstatus?: string | null
          id?: number
          Lieferadresse?: string | null
          "Mitarbeiter für Geräte"?: string | null
          "Monatliche Gesamtrate (€)"?: string | null
          Nutzungsdauer?: string | null
          "Partner Name/Organisatorische Referenz"?: string | null
          partner_id: string
          updated_on?: string | null
        }
        Update: {
          Angebotsnummer_Anbieter?: string | null
          Artikelbezeichnung?: string | null
          Artikelnummer?: string | null
          "bestelldetails Provider"?: Json | null
          Bestellstatus?: string | null
          id?: number
          Lieferadresse?: string | null
          "Mitarbeiter für Geräte"?: string | null
          "Monatliche Gesamtrate (€)"?: string | null
          Nutzungsdauer?: string | null
          "Partner Name/Organisatorische Referenz"?: string | null
          partner_id?: string
          updated_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Werkzeugbestellungen_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerbetriebe"
            referencedColumns: ["partner_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role_secure: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_hero_onboarding_status: {
        Args: { p_partner_id: string }
        Returns: string
      }
      get_steuerberater_onboarding_status: {
        Args: { p_partner_id: string }
        Returns: string
      }
      get_strauss_bestellung_status: {
        Args: { p_partner_id: string }
        Returns: {
          bestelldetails: Json
          bestellstatus: string
          updated_on: string
        }[]
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      match_documents: {
        Args: { filter: Json; match_count: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      set_user_role_by_email: {
        Args: { p_email: string; p_role: string }
        Returns: undefined
      }
      verify_admin_access_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      verify_financial_data_integrity: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

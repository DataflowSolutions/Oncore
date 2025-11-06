import { create } from 'zustand'

type PartyType = 'from_us' | 'from_you'

interface TeamMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  member_type: string | null
  duty?: string
}

interface GridData {
  id: string
  [key: string]: string | number | boolean
}

interface AdvancingField {
  id: string
  section: string
  field_name: string
  field_type: string
  value: unknown
  status: 'pending' | 'confirmed'
  party_type: 'from_us' | 'from_you'
}

interface PartyData {
  team: TeamMember[]
  availablePeople: TeamMember[]
  fields: AdvancingField[]
  teamData: GridData[]
  arrivalFlightData: GridData[]
  departureFlightData: GridData[]
}

interface AdvancingStore {
  party: PartyType
  artistData: PartyData | null
  promoterData: PartyData | null
  
  setParty: (party: PartyType) => void
  setArtistData: (data: PartyData) => void
  setPromoterData: (data: PartyData) => void
  getCurrentData: () => PartyData | null
}

export const useAdvancingStore = create<AdvancingStore>((set, get) => ({
  party: 'from_us',
  artistData: null,
  promoterData: null,
  
  setParty: (party) => {
    set({ party })
    // Update URL without navigation
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('party', party)
      window.history.replaceState({}, '', url.toString())
    }
  },
  
  setArtistData: (data) => set({ artistData: data }),
  
  setPromoterData: (data) => set({ promoterData: data }),
  
  getCurrentData: () => {
    const state = get()
    return state.party === 'from_us' ? state.artistData : state.promoterData
  },
}))

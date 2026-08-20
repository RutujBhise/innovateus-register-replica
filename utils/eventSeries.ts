/**
 * The 14 event series shown in "Selected Event Series".
 *
 * Order, ids and titles are taken from the original's rendered output, not from
 * /api/catalog/series - the API returns a different order, and the page sorts
 * before rendering.
 *
 * `image` points at a local copy in public/images/series/. Each file was
 * verified md5-identical to the CDN's
 *   https://directus.theburnescenter.org/assets/<uuid>?width=50
 * response, so serving locally is pixel-for-pixel the same while dropping a
 * third-party request per row. `uuid` is kept for traceability.
 *
 * Titles preserve the original's stray leading/trailing spaces and its curly
 * apostrophe (U+2019 in "What Doesn't") verbatim.
 */

export type EventSeries = {
  /** Numeric id; the checkbox id is `series-${id}`. */
  id: number
  title: string
  image: string
  uuid: string
  /**
   * Zoom event id from /api/catalog/series. Written to the intake collection's
   * `workshops` field, parallel to the titles in `workshop_series`.
   */
  zoomEventId: string
}

export const EVENT_SERIES: EventSeries[] = [
  {
    id: 60,
    title: 'Practical Approaches to Evaluating AI for Public Benefit',
    image: '/images/series/fall_evaluating-ai-practice-benchmarking.png',
    uuid: '55e9b688-fdda-42b5-8f4e-760686a76d17',
    zoomEventId: '6A2OoPiPQBeMYf5uOadqgw'
  },
  {
    id: 69,
    title: 'AI, Energy, and the Environment: Use, Policy, and Tradeoffs',
    image: '/images/series/fall_energy.png',
    uuid: '81f453b6-e750-4a10-9470-5563de605447',
    zoomEventId: '33Q7IkseT7SzUrVGbVQ-ew'
  },
  {
    id: 62,
    title: 'AI for Public-Sector Procurement',
    image: '/images/series/fall_smarter-procurement.png',
    uuid: 'a7d1642b-de9a-4cfd-9e4d-2ba308769ca0',
    zoomEventId: 'CTI09lxVQDKJhwb8AocicQ'
  },
  {
    id: 45,
    title:
      'Democratic and Public AI: Practical Strategies for Buying, Building, and Governing AI',
    image: '/images/series/fall_public-ai.png',
    uuid: 'f9e1bf61-6006-40d6-aed6-a33c61e83b04',
    zoomEventId: 'VmrOt1pBQeOURLKgIwTOQw'
  },
  {
    id: 64,
    title: 'AI in Public Health',
    image: '/images/series/fall_ai-public-health.png',
    uuid: '72d4a7d2-8b8e-42ac-a3f7-fe32ac960c2b',
    zoomEventId: 'QYgwIYtBRyCPDLVtnJObIg'
  },
  {
    id: 65,
    title: 'The Good, the Bad and the Ugly of Predictive AI ',
    image: '/images/series/fall_good-bad-ugly.png',
    uuid: 'd802e5c6-4fe8-4761-9c95-e1c88c277a88',
    zoomEventId: 'EpXGoHpUSKacKVmy95nK0w'
  },
  {
    id: 66,
    title: 'Using AI in Public Sector Legal Practice',
    image: '/images/series/fall_public-legal-professionals.png',
    uuid: 'ca81f152-9baa-48b0-91a1-18acce55eaea',
    zoomEventId: 's-N3zBuEQNm-nzUKIPGU9A'
  },
  {
    id: 68,
    title: 'Worker-Centered AI Adoption in the Public Sector ',
    image: '/images/series/fall_worker-ai-adoption.png',
    uuid: '1cb29c6c-7d8a-439b-96e3-00d8d778c3e2',
    zoomEventId: 'O_VArb7gTe6Ht7RayyFXEg'
  },
  {
    id: 104,
    title: 'AI Insourcing and the Government Product Model ',
    image: '/images/series/fall_ai-insourcing.png',
    uuid: 'c9f7f88e-3edf-437e-81f6-20f8638a05b8',
    zoomEventId: '5uh2CloSSlmkXX408_NHHA'
  },
  {
    id: 38,
    title: 'Amplify: Mastering Public Communication in the AI Age',
    image: '/images/series/Amplify-Fall.png',
    uuid: '595ed67c-7071-45e0-b26a-6518252d79a0',
    zoomEventId: 'upWC8HmJQXSaEME3TpzW1Q'
  },
  {
    id: 63,
    title:
      'Working with AI Agents in the Public Sector: What Works (and What Doesn’t)',
    image: '/images/series/fall_working-ai-agents.png',
    uuid: 'ff664fe2-1f1f-440b-ac60-b93662b4cc07',
    zoomEventId: '8i0WA2IiTMiKVf5Z3Eor5Q'
  },
  {
    id: 70,
    title: 'AI for Public HR Professionals ',
    image: '/images/series/fall_public-hr.png',
    uuid: '8b6a0119-64d4-4bee-85b4-50cb82e084f4',
    zoomEventId: 'I92Aw2AiQg2KUc5ToZM17Q'
  },
  {
    id: 71,
    title: 'AI and Cybersecurity in the Public Sector for the Non-Expert',
    image: '/images/series/fall_ai-cybersecurity.png',
    uuid: '674a363b-f9a1-4da8-811e-e3653a0dcdd0',
    zoomEventId: 'I-sdNsfBRX-wbZYFI_O62w'
  },
  {
    id: 40,
    title: ' The Prompting Lab: Real Prompts, Real Challenges, All Platforms',
    image: '/images/series/fall_prompting-lab.png',
    uuid: 'dedd4a1e-fe11-4230-8635-8eaeda8e42f7',
    zoomEventId: 'GWCrm6vRRBaengq1KyFhxg'
  }
]

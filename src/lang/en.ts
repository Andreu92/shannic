const en = {
  lang: {
    es: "Spanish",
    ca: "Catalan",
    en: "English",
    zh_CN: "Chinese",
    ar: "Arabic",
    it: "Italian",
    fr: "French",
    de: "German",
    pt_PT: "Portuguese",
    ru: "Russian",
    pl: "Polish",
    nl: "Dutch",
    ja: "Japanese",
  },
  network: {
    offline: "No internet connection.",
  },
  generic: {
    yes: "Yes",
    no: "No",
    cancel: "Cancel",
    no_results: "Oops! It seems I can't find anything.",
    create: "Create",
  },
  pages: {
    home: "Home",
    search: "Search",
    favorites: "Favorites",
    playlists: "Playlists",
  },
  search: {
    start: "What would you like to listen to?",
    error: "Error performing the search in the cloud.",
    no_results: "No results found.",
    all: "All",
    music: "Music",
  },
  favorites: {
    start: "Don't you have any favorites yet? :O",
    delete: {
      header: "Delete favorite",
      message: "Are you sure you want to delete {title} from your favorites?",
    },
    download: {
      header: "Download favorites",
      message:
        "Are you sure you want to download all your favorites? Make sure you have enough space on your device!",
    },
  },
  playlists: {
    start: "Don't you have any playlists yet? :O",
    create: "Create playlist",
    placeholders: {
      name: "Playlist name",
    },
    delete: {
      header: "Delete playlist",
      message: "Are you sure you want to delete {title} from your playlists?",
    },
  },
  playlist: {
    alreadyDownloaded: "The selection has been downloaded already.",
  },
  settings: {
    language: "Language",
    theme: "Theme",
    cache: "Clear cache",
    cache_cleared: "Cached audios cleared.",
    erase_all: "Delete all",
    erase: {
      header: "Delete all data",
      message:
        "Are you sure you want to delete everything and return to the initial state? This cannot be undone!",
    },
  },
  errors: {
    audio_unplayable: "This audio cannot be played.",
    src_error: "Error playing the audio.",
  },
  spotify: {
    link: "Link Spotify",
    unlink: "Unlink Spotify",
    import: "Import from Spotify",
    unlinked: "Spotify account unlinked.",
    not_linked: "No Spotify account is linked.",
    link_process_failed: "Could not link the Spotify account.",
    starting_import: "Starting import...",
    import_error: "Error importing from Spotify.",
    favorites: {
      importing: "Importing favorites... ({0} of {1})",
    },
  },
  update: {
    title: "Update available!",
    message: "Version {0} is available. Would you like to download it?",
  },
};

export default en;

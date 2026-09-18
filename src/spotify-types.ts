export interface SpotifyAccessToken {
  clientId: string;
  accessToken: string;
  accessTokenExpirationTimestampMs: number;
  isAnonymous: boolean;
}

export interface SpotifyClientToken {
  response_type: string;
  granted_token: {
    token: string;
    expires_after_seconds: number;
    refresh_after_seconds: number;
    domains: {
      domain: string;
    }[];
  };
}

export interface SpotifyLibraryResponse {
  data: {
    me: {
      library: {
        tracks: UserLibraryTrackPage;
      };
    };
  };
}

export interface UserLibraryTrackPage {
  __typename: "UserLibraryTrackPage";
  items: UserLibraryTrackResponse[];
  pagingInfo: {
    nextOffset: number | null;
  };
  totalCount: number;
}

export interface UserLibraryTrackResponse {
  __typename: "UserLibraryTrackResponse";
  track: {
    _uri: string;
    data: Track;
  };
}

export interface Track {
  __typename: "Track";
  albumOfTrack: Album;
  artists: {
    items: Artist[];
  };
  contentRating: {
    label: string;
  };
  discNumber: number;
  duration: {
    totalMilliseconds: number;
  };
  id: string;
  name: string;
  playability: {
    playable: boolean;
  };
  previews: {
    audioPreviews: {
      items: AudioPreviewItem[];
    };
  };
  trackNumber: number;
  uri: string;
}

export interface Album {
  artists: {
    items: Artist[];
  };
  coverArt: {
    sources: CoverArtSource[];
  };
  name: string;
  uri: string;
}

export interface Artist {
  profile: {
    name: string;
  };
  uri: string;
}

export interface CoverArtSource {
  height: number;
  url: string;
  width: number;
}

export interface AudioPreviewItem {
  url: string;
}

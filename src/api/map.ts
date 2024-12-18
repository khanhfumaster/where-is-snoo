const accessToken = '';

const GRAPH_BASE_URL = 'https://graph.mapillary.com';

const NORTH_AMERICA_BOUNDING_BOX = [-125, 24, -66, 50];
const EUROPE_BOUNDING_BOX = [-10, 36, 30, 70];
const ASIA_BOUNDING_BOX = [30, 0, 180, 70];
const AUSTRALIA_BOUNDING_BOX = [110, -45, 160, -10];
const SOUTH_AMERICA_BOUNDING_BOX = [-80, -60, -35, 15];
const AFRICA_BOUNDING_BOX = [-20, -35, 50, 40];

const BOUNDING_BOXES = {
  NORTH_AMERICA: NORTH_AMERICA_BOUNDING_BOX,
  EUROPE: EUROPE_BOUNDING_BOX,
  ASIA: ASIA_BOUNDING_BOX,
  AUSTRALIA: AUSTRALIA_BOUNDING_BOX,
  SOUTH_AMERICA: SOUTH_AMERICA_BOUNDING_BOX,
  AFRICA: AFRICA_BOUNDING_BOX,
};

function getRandomBoundingBox() {
  const keys = Object.keys(BOUNDING_BOXES);
  const randomIndex = Math.floor(Math.random() * keys.length);
  const randomKey = keys[randomIndex];
  return (BOUNDING_BOXES as any)[randomKey];
}

export async function getStreetViewImages(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  limit: number = 10
) {
  const url = `${GRAPH_BASE_URL}/images?access_token=${accessToken}&fields=id,thumb_1024_url,width,is_pano&bbox=${lon1},${lat1},${lon2},${lat2}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.data;
}

export async function getImageGeometryData(imageId: string) {
  const url = `${GRAPH_BASE_URL}/${imageId}?access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();
  return {
    lat: data.geometry.coordinates[1],
    lng: data.geometry.coordinates[0],
  };
}

export async function getRandomStreetViewImage() {
  const [lon1, lat1, lon2, lat2] = getRandomBoundingBox();
  const results = await getStreetViewImages(lat1, lon1, lat2, lon2);

  const streetViewImages = results.filter((image: any) => !image.is_pano);

  const randomIndex = Math.floor(Math.random() * streetViewImages.length);
  return streetViewImages[randomIndex];
}

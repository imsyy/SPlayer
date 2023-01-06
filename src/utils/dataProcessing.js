export const getAllArtists = (data) => {
    let artists = [];
    if (data) {
        artists = [];
        data.forEach(v => {
            artists.push(v.name);
        });
    }
    return artists.join('/');
}
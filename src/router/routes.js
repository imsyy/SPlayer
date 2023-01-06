const routes = [{
        path: '/',
        name: 'home',
        meta: {
            title: '首页',
        },
        component: () => import('@/views/Home/HomeView.vue'),
    },
    {
        path: '/search',
        name: 'search',
        meta: {
            title: '搜索',
        },
        component: () => import('@/views/Search/index.vue'),
        redirect: '/search/songs',
        children: [{
            path: '/search/songs',
            name: 's-songs',
            component: () => import('@/views/Search/songs.vue'),
        }, {
            path: '/search/artists',
            name: 's-artists',
            component: () => import('@/views/Search/artists.vue'),
        }, {
            path: '/search/albums',
            name: 's-albums',
            component: () => import('@/views/Search/albums.vue'),
        }, {
            path: '/search/videos',
            name: 's-videos',
            component: () => import('@/views/Search/videos.vue'),
        }, {
            path: '/search/playlists',
            name: 's-playlists',
            component: () => import('@/views/Search/playlists.vue'),
        }, ]
    }, {
        path: '/comment',
        name: 'comment',
        meta: {
            title: '歌曲评论',
        },
        component: () => import('@/views/Comment/CommentView.vue'),
    }, {
        path: '/setting',
        name: 'setting',
        meta: {
            title: '全局设置',
        },
        component: () => import('@/views/Setting/SettingView.vue'),
    }, {
        path: '/login',
        name: 'login',
        meta: {
            title: '登录',
        },
        component: () => import('@/views/Login/LoginView.vue'),
    }, {
        path: '/video',
        name: 'video',
        meta: {
            title: '视频',
        },
        component: () => import('@/views/Video/VideoView.vue'),
    },{
        path: '/discover',
        name: 'discover',
        meta: {
            title: '发现',
        },
        component: () => import('@/views/Discover/index.vue'),
    }, {
        path: '/playlist',
        name: 'playlist',
        meta: {
            title: '歌单',
        },
        component: () => import('@/views/PlayList/PlayListView.vue'),
    }, {
        path: '/song',
        name: 'song',
        meta: {
            title: '歌曲',
        },
        component: () => import('@/views/Song/SongView.vue'),
    }, {
        path: '/dailySongs',
        name: 'dailySongs',
        meta: {
            title: '每日推荐',
            needLogin: true,
        },
        component: () => import('@/views/DailySongs/DailySongsView.vue'),
    }, {
        path: '/album',
        name: 'album',
        meta: {
            title: '专辑',
        },
        component: () => import('@/views/Album/AlbumView.vue'),
    }, {
        path: '/user',
        name: 'user',
        meta: {
            title: '我的',
            needLogin: true,
        },
        component: () => import('@/views/User/index.vue'),
        redirect: '/user/playlists',
        children: [{
            path: 'playlists',
            name: 'playlists',
            component: () => import('@/views/User/playlists.vue')
        }, {
            path: 'cloud',
            name: 'cloud',
            component: () => import('@/views/User/cloud.vue')
        }]
    }, {
        path: '/artist',
        name: 'artist',
        meta: {
            title: '歌手',
        },
        component: () => import('@/views/Artist/index.vue'),
        redirect: '/artist/songs',
        children: [{
            path: 'songs',
            name: 'ar-songs',
            component: () => import('@/views/Artist/songs.vue'),
        }, {
            path: 'albums',
            name: 'ar-albums',
            component: () => import('@/views/Artist/albums.vue'),
        }, {
            path: 'videos',
            name: 'ar-videos',
            component: () => import('@/views/Artist/videos.vue'),
        }]
    },
]

export default routes
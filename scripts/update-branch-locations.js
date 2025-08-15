const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Bank SulutGo branch data scraped from their website
const bankSulutGoBranches = [
  // Main Branches (Kantor Cabang)
  {
    name: 'Cabang Utama',
    address: 'Jl. Sam Ratulangi No. 9 Manado 95111',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Jakarta',
    address: 'Gedung Rajawali Place Kuningan Lt. 2B & 7A&7B Jl. HR Rasuna Said Kec. Kuningan',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta'
  },
  {
    name: 'Cabang Gorontalo',
    address: 'Jl. M.T. Haryono No. 18',
    city: 'Gorontalo',
    province: 'Gorontalo'
  },
  {
    name: 'Cabang Surabaya',
    address: 'Jalan Diponegoro No. 28 C-D, Kelurahan Darmo, Kecamatan Wonokromo',
    city: 'Surabaya',
    province: 'Jawa Timur'
  },
  {
    name: 'Cabang Kotamobagu',
    address: 'Jl. A. Yani no. 187 Kotamobagu',
    city: 'Kotamobagu',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Tahuna',
    address: 'Jl. DR. Sutomo No. 60',
    city: 'Tahuna',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Bitung',
    address: 'Jl. Yos Sudarso No. 13/12',
    city: 'Bitung',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Kawangkoan',
    address: 'Jl. Raya Kawangkoan. Kab. Minahasa',
    city: 'Kawangkoan',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Limboto',
    address: 'Jl. Mayor Dullah No. 1',
    city: 'Limboto',
    province: 'Gorontalo'
  },
  {
    name: 'Cabang Tondano',
    address: 'Jl. Tountemboan',
    city: 'Tondano',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Tomohon',
    address: 'Jl. Raya Tomohon Kota Tomohon',
    city: 'Tomohon',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Marisa',
    address: 'Jl. Trans Sulawesi No. 12a',
    city: 'Marisa',
    province: 'Gorontalo'
  },
  {
    name: 'Cabang Calaca',
    address: 'Jl. Sisingamangaraja No. 23 Manado',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Amurang',
    address: 'Kel. Ranoyapo Lk. IV Amurang (Kab. Minsel)',
    city: 'Amurang',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Tilamuta',
    address: 'jl. Ade Irma Suryani Nasution,Desa Hungayonaa Kec. Tilamuta',
    city: 'Tilamuta',
    province: 'Gorontalo'
  },
  {
    name: 'Cabang Airmadidi',
    address: 'Jl. Raya Manado-Bitung Kel. Sarongsong 1',
    city: 'Airmadidi',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Melonguane',
    address: 'Jl. Dalam Kota Kel. Melonguane Barat Lingk 1 Kec. Melonguane - Kab. Kepulauan Talaud',
    city: 'Melonguane',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Ratahan',
    address: 'Desa Tosuraya Kec Ratahan Kab. Minahasa Tenggara',
    city: 'Ratahan',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Tutuyan',
    address: 'Jl. Raya Trans Sulawesi Lingkar Selatan-Tutuyan',
    city: 'Tutuyan',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Lolak',
    address: 'Jl. Trans Sulawesi Desa Mongkoinit Kec.Lolak Kab.Bolaang Mongondow',
    city: 'Lolak',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KC Siau',
    address: 'Jl. Boulevard Raya Kawasan Plaza Siau Blok B 8-10 Kel. Tarorane Kec. Siau Timur, Kab. Kepl. Siau Tagulandang Biaro',
    city: 'Siau',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KC Suwawa',
    address: 'Jl. Pasar Minggu No.91 Desa Bubeya Kec. Suwawa Kab. Bone Bolango',
    city: 'Suwawa',
    province: 'Gorontalo'
  },
  {
    name: 'KC Kwandang',
    address: 'Jl. Trans Sulawesi Desa Molingkapoto Selatan Kec. Kwandang, Kab. Gorontalo-Utara',
    city: 'Kwandang',
    province: 'Gorontalo'
  },
  {
    name: 'Cabang Boroko',
    address: 'Jl. Trans Sulawesi-Boroko Kec. Kaidipang Kab. Bolaang Mongondow Utara',
    city: 'Boroko',
    province: 'Sulawesi Utara'
  },
  {
    name: 'Cabang Malang',
    address: 'Jl. Letjen S. Parman No. 25 Kota Malang, Provinsi Jawa Timur 65122',
    city: 'Malang',
    province: 'Jawa Timur'
  },
  {
    name: 'KC Molibagu',
    address: 'Jl. Daopeyago No. 70 Desa Popodu Kec. Bolaang Uki Kabupaten Bolaang Mongondow Selatan',
    city: 'Molibagu',
    province: 'Sulawesi Utara'
  },
  
  // Sub Branches (Kantor Cabang Pembantu)
  {
    name: 'KCP Lirung',
    address: 'Komp. Pertokoan Lirung Kec. Lirung Kab. Talaud',
    city: 'Lirung',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Kelapa Gading',
    address: 'Jl. Boulevard Raya Blok TA 2/19 Kelapa Gading Jakarta',
    city: 'Jakarta Utara',
    province: 'DKI Jakarta'
  },
  {
    name: 'KCP Cempaka Putih',
    address: 'Jl. Cempaka Putih Raya No. 135, Kelurahan Cempaka Putih',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta'
  },
  {
    name: 'KCP Mangga Dua',
    address: 'Lobby Utama Orion Dusit Mangga Dua Lantai Dasar No. 1, Jl. Mangga Dua Raya',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta'
  },
  {
    name: 'KCP Popayato',
    address: 'Jl. Raya Trans Sulawesi-Desa Maleo Kab.Pohuwato',
    city: 'Popayato',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Pasar Sentral',
    address: 'Jl. Patimura No. 13 Kel. Limba U Satu, Kec. Kota Selatan, Kota Gorontalo - Provinsi Gorontalo 96135',
    city: 'Gorontalo',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Tagulandang',
    address: 'Kompleks Pasar 66 Desa Balehumara, Kec Tagulandang, Kab. Kepulauan Siau Tagulandang Biaro',
    city: 'Tagulandang',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Tuminting',
    address: 'Jl. Santiago No.141A Kel.Tuminting Manado',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Likupang',
    address: 'Komp.Pertokoan Likupang, Desa Likupang II Kec.Likupang Timur Minut',
    city: 'Likupang',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Pasar Segar Paal Dua',
    address: 'Jln. Yos Sudarso Kel. Paal Dua , Kec. Tikala , Kota Manado',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Paguat',
    address: 'Jln. Trans Sulawesi Kelurahan Pentadu Kec. Paguat Kab. Pohuwato Prov. Gorontalo',
    city: 'Paguat',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Motoling',
    address: 'Jl. Raya Motoling, Desa Motoling Jaga I Kecamatan Motoling Kab. Minahasa Selatan',
    city: 'Motoling',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Randangan',
    address: 'Jl. Raya Trans Sulawesi Desa Motolahu Kec. Randangan Kab. Pohuwato - Provinsi Gorontalo',
    city: 'Randangan',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Tolangohula',
    address: 'Jl. Pabrik Gula Desa Sukamamur Kec. Tolangohula Kab. Gorontalo - Provinsi Gorontalo',
    city: 'Tolangohula',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Langowan',
    address: 'Jl. Raya Amongena No.205 Komp. Pertokoan Langowan, Desa Wolaang Timur Kec. Langowan Timur Kab. Minahasa',
    city: 'Langowan',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Manembo-Nembo',
    address: 'Jl. Raya Manado-Bitung,Kel. Manembo-nembo, Kec. Matuari Kota Bitung',
    city: 'Bitung',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Telaga',
    address: 'Jl. A. A. Wahab Desa Bulila Kecamatan telaga Kabupaten Gorontalo - Provinsi Gorontalo',
    city: 'Telaga',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Tamako',
    address: 'Jl. Raya Nagha Satu Desa Nagha Satu Kec. Tamako Kab. Sangihe Provinsi Sulawesi Utara',
    city: 'Tamako',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Bahu',
    address: 'Kompleks Ruko Bahu Mall blok S 14 Jl. Wolter Mongisidi Kel. Bahu Kec. Malalayang Kota Manado',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Ranotana',
    address: 'Jl. Sam Ratulangi No. 432 Kel. Ranotana Kec. Sario Kota Manado',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Paguyaman',
    address: 'Jl. Trans Sulawesi Desa Rejonegoro Kec. Paguyaman Kab. Boalemo',
    city: 'Paguyaman',
    province: 'Gorontalo'
  },
  {
    name: 'KCP Sam Ratulangi',
    address: 'Jl. Sam Ratulangin No. 27 Manado 95111',
    city: 'Manado',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Beo',
    address: 'Jl. Larenggam Kelurahan Beo Timur Kecamatan Beo Kabupaten Kepulauan Talaud',
    city: 'Beo',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Mopuya',
    address: 'Desa Mopuya Selatan Kec. Dumoga Utara Kabupaten Bolaang Mongondow',
    city: 'Mopuya',
    province: 'Sulawesi Utara'
  },
  {
    name: 'KCP Modoinding',
    address: 'Desa Pinasungkulan Kec. Modoinding Kab. Minahasa Selatan',
    city: 'Modoinding',
    province: 'Sulawesi Utara'
  }
];

// Function to find matching branch by name similarity
function findMatchingBranch(branchName) {
  const normalizedName = branchName.toLowerCase().trim();
  
  // Direct name matching
  let match = bankSulutGoBranches.find(branch => {
    const branchNameLower = branch.name.toLowerCase();
    return branchNameLower.includes(normalizedName) || normalizedName.includes(branchNameLower.replace(/^(cabang|kcp|kc)\s+/i, ''));
  });
  
  if (!match) {
    // Try matching without prefixes
    const nameWithoutPrefix = normalizedName.replace(/^(cabang|kcp|kc)\s+/i, '');
    match = bankSulutGoBranches.find(branch => {
      const branchNameWithoutPrefix = branch.name.toLowerCase().replace(/^(cabang|kcp|kc)\s+/i, '');
      return branchNameWithoutPrefix.includes(nameWithoutPrefix) || nameWithoutPrefix.includes(branchNameWithoutPrefix);
    });
  }
  
  return match;
}

async function updateBranchLocations() {
  try {
    console.log('Starting branch location update...');
    
    // Get all branches from database
    const branches = await prisma.branch.findMany();
    console.log(`Found ${branches.length} branches in database`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const branch of branches) {
      const match = findMatchingBranch(branch.name);
      
      if (match) {
        // Update the branch with new location data
        await prisma.branch.update({
          where: { id: branch.id },
          data: {
            address: match.address,
            city: match.city,
            province: match.province
          }
        });
        
        console.log(`✓ Updated: ${branch.name} -> ${match.name} (${match.city}, ${match.province})`);
        updatedCount++;
      } else {
        console.log(`✗ No match found for: ${branch.name}`);
        notFoundCount++;
      }
    }
    
    console.log(`\nUpdate completed:`);
    console.log(`- Updated: ${updatedCount} branches`);
    console.log(`- Not found: ${notFoundCount} branches`);
    
  } catch (error) {
    console.error('Error updating branch locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateBranchLocations();
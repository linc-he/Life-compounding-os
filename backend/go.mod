module github.com/linc-he/Life-compounding-os/backend

go 1.22

require (
	github.com/gin-contrib/cors v1.7.2
	github.com/gin-gonic/gin v1.10.0
	gorm.io/driver/sqlite v1.5.6
	gorm.io/gorm v1.25.10
)

require (
	github.com/mattn/go-sqlite3 v1.14.22 // indirect
	gorm.io/driver/sqlite v1.5.6 // direct
)

// Pure-Go SQLite driver, no CGO required.
replace github.com/mattn/go-sqlite3 => github.com/glebarez/go-sqlite v1.11.0

// Use glebarez/sqlite GORM driver (pure Go, built on modernc.org/sqlite)
replace gorm.io/driver/sqlite => github.com/glebarez/sqlite v1.11.0

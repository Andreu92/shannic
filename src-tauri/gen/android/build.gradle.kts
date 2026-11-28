buildscript {
    repositories {
        google()
        maven("https://jitpack.io")
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:9.5.3")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.10")
    }
}

allprojects {
    repositories {
        google()
        maven("https://jitpack.io")
        mavenCentral()
    }
}

tasks.register("clean").configure {
    delete("build")
}


package com.gov.mobile.pet

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Иконка приложения под вид питомца.
 *
 * Включает один псевдоним активности из манифеста и выключает остальные.
 * DONT_KILL_APP — чтобы игра не закрывалась при смене; лаунчер
 * обновит иконку сам, на некоторых — с задержкой.
 */
class PetIconModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName() = "PetIcon"

  @ReactMethod
  fun setIcon(speciesId: String) {
    val target = ALIASES[speciesId] ?: return
    val pm = reactApplicationContext.packageManager
    val pkg = reactApplicationContext.packageName
    ALIASES.values.forEach { alias ->
      val state =
        if (alias == target) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
      val component = ComponentName(pkg, "$pkg.$alias")
      if (pm.getComponentEnabledSetting(component) != state) {
        pm.setComponentEnabledSetting(component, state, PackageManager.DONT_KILL_APP)
      }
    }
  }

  companion object {
    private val ALIASES =
      mapOf("cat" to "IconCat", "dog" to "IconDog", "pig" to "IconPig", "monkey" to "IconMonkey")
  }
}

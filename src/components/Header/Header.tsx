import styles from './Header.module.css'

/**
 * 顶部标题区
 * 展示品牌名称「数感道场」与副标题
 */
export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.ornament}>
        <span className={styles.ornamentLine} />
        <span className={styles.ornamentDot} />
        <span className={styles.sub}>Number Sense Dojo</span>
        <span className={styles.ornamentDot} />
        <span className={styles.ornamentLine} />
      </div>
      <h1 className={styles.title}>
        数感<span className={styles.charVermilion}>道</span>场
        <span className={styles.seal}>速算</span>
      </h1>
      <p className={styles.tagline}>考 公 速 算 · 以 算 修 心</p>
    </header>
  )
}
